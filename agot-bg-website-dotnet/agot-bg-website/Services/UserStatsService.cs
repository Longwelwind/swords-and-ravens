using agot_bg_website.Data;
using agot_bg_website.Domain;
using agot_bg_website.Services.GameListing;
using Microsoft.EntityFrameworkCore;

namespace agot_bg_website.Services;

/// <summary>Result of a stats recalculation - see <see cref="UserStatsService.RecalculateAsync"/>.
/// <paramref name="FinishedGamesCount"/> only considers games actually in state Finished (minus
/// faceless games, which the games list hides entirely too) - it deliberately excludes games left
/// early (<paramref name="RemovedFromGameCount"/>) and never includes cancelled games, so it
/// always reconciles with "Ongoing + Finished" on the profile's games list.
/// <paramref name="RemovedFromGameCount"/> counts a removal as soon as it happens, whether the game has
/// since finished, is still Ongoing, or was later Cancelled - a player who was voted out/left
/// doesn't get a pass just because nobody's won yet or the game got cancelled afterwards (only a
/// clock-timeout removal from a Cancelled game is excluded) - except a removal from a game the
/// user had joined as a replacer,
/// which is excluded here too (same "no downside risk" rule as a still-seated replacer's loss),
/// since <c>replacerIds</c> keeps naming a user even after they themselves get removed again - see
/// <see cref="RecalculateAsync"/>. <paramref name="WinRate"/>'s denominator is the only place
/// left-early games get folded in (always as a loss), and it further excludes the tutorial
/// variant and any row without a recorded outcome - see <see cref="WinRateCalculator"/>.
/// <paramref name="ReplacerGamesCount"/> counts every non-faceless game (any state) the user
/// joined as a replacer - see <see cref="ApplicationUser.CachedReplacerGamesCount"/>. <paramref
/// name="ReplacerWinsCount"/> and <paramref name="ReplacerLossesExcludedCount"/> are scoped
/// identically to <paramref name="WinRate"/> itself (Finished, non-tutorial, recorded outcome)
/// specifically so the two reconcile: <paramref name="ReplacerWinsCount"/> is a subset already
/// folded into <paramref name="WonGamesCount"/>/the numerator, while <paramref
/// name="ReplacerLossesExcludedCount"/> is dropped from both the numerator and denominator
/// entirely - together they make the win-rate percentage auditable from the other numbers shown
/// on the profile page.</summary>
public record UserStatsResult(
    int WonGamesCount,
    int FinishedGamesCount,
    int RemovedFromGameCount,
    double? WinRate,
    int ReplacerGamesCount,
    int ReplacerWinsCount,
    int ReplacerLossesExcludedCount
);

/// <summary>
/// Computes and persists a user's cached win-rate stats (<see
/// cref="ApplicationUser.CachedWinRate"/> and friends), reusing the exact same facts/formula
/// <see cref="WinRateCalculator"/> already implements - see that type's doc comment and
/// MIGRATION_PLAN.md §10.2.
///
/// Called from two places: <see cref="Infrastructure.Stats.UserStatsRecalculationBackgroundService"/>
/// in the background whenever a game finishes (see Api.GamesApi's PATCH handler, which enqueues
/// every participant), and synchronously from Pages.UserModel as a one-time fallback for any user
/// whose stats have never been cached yet (<see cref="ApplicationUser.StatsCachedAt"/> is null).
///
/// Deliberately never touches Game.SerializedGame - only PlayerInGame.Data/Game.ViewOfGame/State,
/// mirroring the same "no full Game entity load" discipline as
/// GameListQueryService/UserModel.LoadGamesAsync.
/// </summary>
public sealed class UserStatsService(ApplicationDbContext db)
{
    public async Task<UserStatsResult?> RecalculateAsync(
        Guid userId,
        CancellationToken cancellationToken = default
    )
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user is null)
        {
            // Deleted between being enqueued and the background service picking it up - nothing
            // to cache stats for.
            return null;
        }

        var participationRows = await db
            .PlayersInGame.Where(p => p.UserId == userId && p.Game != null)
            .Select(p => new
            {
                p.Data,
                State = p.Game!.State,
                p.Game.ViewOfGame,
            })
            .ToListAsync(cancellationToken);

        // Faceless games hide who's playing which house entirely, so Pages.UserModel's games
        // list (GamesOfUser/CancelledGames) excludes them outright - see UserModel.LoadGamesAsync.
        // "Finished games" below must line up with that same list (Games badge = Ongoing +
        // Finished, always), so it applies the identical faceless exclusion rather than only the
        // narrower "has a recorded is_winner and isn't the tutorial" exclusion win-rate needs.
        var nonFacelessRows = participationRows
            .Where(row => !ViewOfGameInfo.Parse(row.ViewOfGame).IsFaceless)
            .ToList();

        var winRateFacts = nonFacelessRows
            .Select(row =>
            {
                var view = ViewOfGameInfo.Parse(row.ViewOfGame);
                var isWinner = PlayerInGameInfo.Parse(row.Data).IsWinner;

                // A row only counts towards the win-rate percentage once it's actually finished
                // with a recorded outcome and isn't the "learn the game" tutorial variant - see
                // MIGRATION_PLAN.md §10.2 and Django's identical exclusions in user_profile().
                // Cancelled/Ongoing/InLobby games never reach here as "finished" (they simply
                // don't set countsTowardsWinRate), matching the product rule that cancelled games
                // must never affect stats at all.
                var countsTowardsWinRate =
                    row.State == GameState.Finished && !view.IsLearnTheGame && isWinner.HasValue;
                return new WinRateGameFact(
                    IsFinished: countsTowardsWinRate,
                    IsWinner: isWinner == true,
                    // See WinRateCalculator's doc comment: a loss in a game joined as a replacer
                    // is excluded from the win-rate percentage entirely, but a win still counts.
                    IsReplacer: view.IsPureReplacer(userId)
                );
            })
            .ToList();

        // Shown on the profile page as "Replacer games" - counts every game the user joined as a
        // replacer (Finished/Ongoing/Cancelled), not restricted to Finished like
        // FinishedGamesCount, since jumping in to help is worth showing even before the game
        // ends. Uses nonFacelessRows (i.e. IsFaceless as of THIS row's currently-stored
        // ViewOfGame) rather than a separate "was ever faceless" check: the game server
        // permanently resets `faceless` to false and reveals real usernames the moment a game
        // reaches Finished or Cancelled (`GameEndedGameState`/`CancelledGameState.firstStart()` ->
        // `EntireGame.hideOrRevealUserNames(true)`), so in practice this only ever excludes a
        // still-Ongoing faceless game - a Finished/Cancelled one is never actually faceless by the
        // time its ViewOfGame is read here.
        var replacerGamesCount = nonFacelessRows.Count(row =>
            ViewOfGameInfo.Parse(row.ViewOfGame).ReplacerIds.Contains(userId)
        );

        // Scoped identically to winRateFacts's own IsFinished (countsTowardsWinRate) so these two
        // numbers reconcile exactly with WinRate itself - see UserStatsResult's doc comment.
        // ReplacerWinsCount is a subset already counted in winRate.Wins; ReplacerLossesExcludedCount
        // is the flip side WinRateCalculator drops entirely (neither a win nor a loss).
        var replacerWinsCount = winRateFacts.Count(f => f.IsFinished && f.IsReplacer && f.IsWinner);
        var replacerLossesExcludedCount = winRateFacts.Count(f =>
            f.IsFinished && f.IsReplacer && !f.IsWinner
        );

        // A removal always counts as a loss regardless of whether the game has finished yet - a
        // player voted out/timed out of a still-Ongoing game doesn't get a pass just because
        // nobody's declared a winner yet. A removal from a game that was later Cancelled counts
        // too (e.g. a player rage-quits, gets vassalized by vote, and the remaining players then
        // cancel the game) - leaving early must not be erased just because the game never
        // finished. The one exception is a clock-timeout removal from a Cancelled game: a
        // cancelled game counts for nobody else, so penalizing a timeout there would be unfair.
        // InLobby games are excluded (a removal can't happen there anyway).
        // The tutorial variant is excluded here too, for the same reason it's excluded from the
        // win side above - a "learn the game" removal must not count as a loss either. A removal
        // from a game the user joined as a *pure* replacer (IsPureReplacer, same check as the
        // win-rate side's IsReplacer fact) is excluded for the same reason too: replacerIds only
        // ever grows (see IngameGameState.ts's replace-player vote), so it still names the user
        // even after they themselves get removed again - without this check a player who
        // generously jumped into a stalling game as a replacer, and then got timed out/voted out
        // of it in turn, would eat a full loss despite the "no downside risk" promise the
        // replacer-loss exclusion above already makes for a still-seated replacer. But a user who
        // was ALSO one of the original players of this game (initialPlayerIds) doesn't get this
        // exemption for their own removal - having started the game themselves, a later removal
        // (even from a different house they'd replaced into) is a real loss, not one they can
        // point to "I was only ever there to help". The row itself is still shown (badged) on the
        // profile's "Previously participated games" list - see UserModel.
        var removedFromGameViewsOfGame = await db
            .PreviousPlayersInGame.Where(p =>
                p.UserId == userId
                && (
                    p.Game!.State == GameState.Finished
                    || p.Game.State == GameState.Ongoing
                    || (
                        p.Game.State == GameState.Cancelled
                        && p.Reason != PlayerReplacementReason.ClockTimeout
                    )
                )
            )
            .Select(p => p.Game!.ViewOfGame)
            .ToListAsync(cancellationToken);
        var removedFromGameCount = removedFromGameViewsOfGame.Count(viewOfGame =>
        {
            var view = ViewOfGameInfo.Parse(viewOfGame);
            return !view.IsLearnTheGame && !view.IsPureReplacer(userId);
        });

        var winRate = WinRateCalculator.Calculate(winRateFacts, removedFromGameCount);

        // "Finished games" (as shown on the profile page) must only consider games actually in
        // state Finished - it deliberately does NOT exclude the tutorial/no-recorded-outcome rows
        // the win-rate percentage above excludes, and does NOT include PreviousPlayerInGame rows
        // (games left early) either, so this always reconciles with Games = Ongoing + Finished on
        // the games list itself.
        var finishedGamesCount = nonFacelessRows.Count(row => row.State == GameState.Finished);

        user.CachedWonGamesCount = winRate.Wins;
        user.CachedFinishedGamesCount = finishedGamesCount;
        user.CachedRemovedFromGameCount = removedFromGameCount;
        user.CachedWinRate = winRate.WinRate;
        user.CachedReplacerGamesCount = replacerGamesCount;
        user.CachedReplacerWinsCount = replacerWinsCount;
        user.CachedReplacerLossesExcludedCount = replacerLossesExcludedCount;
        user.StatsCachedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        return new UserStatsResult(
            winRate.Wins,
            finishedGamesCount,
            removedFromGameCount,
            winRate.WinRate,
            replacerGamesCount,
            replacerWinsCount,
            replacerLossesExcludedCount
        );
    }
}
