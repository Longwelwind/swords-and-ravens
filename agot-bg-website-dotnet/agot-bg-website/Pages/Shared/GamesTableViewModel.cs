using agot_bg_website.Services.GameListing;

namespace agot_bg_website.Pages.Shared;

/// <summary>View model for the shared _GamesTable partial, reused across Games/MyGames and every
/// admin-only inactive/replacement-needed sub-list — the .NET equivalent of Django's
/// `games_table` template tag.</summary>
public sealed class GamesTableViewModel
{
    public required IReadOnlyList<GameListItem> Games { get; init; }

    /// <summary>Show the Open/Ongoing badge per row - needed whenever a list can mix both states (e.g. "My games").</summary>
    public bool ShowStateBadge { get; init; } = true;

    /// <summary>Show a "Join as &lt;waited player&gt;" action for admins/high members on replacement-needed and inactive lists.</summary>
    public bool ShowJoinAsWaited { get; init; }

    /// <summary>
    /// Show a "Join as host" action for admins/high members on IN_LOBBY rows — lets them join a
    /// dead/stuck lobby as its owner (Django's <c>show_join_as_owner</c>). Row-gated on
    /// <c>game.State == GameState.InLobby</c> in the partial itself (not every list this flag is
    /// set on necessarily contains only lobby games, e.g. "My games").
    /// </summary>
    public bool ShowJoinAsOwner { get; init; }

    public bool CanPlayAsAnotherPlayer { get; init; }

    /// <summary>Show a "Cancel" button per row for admins/high members — Django's <c>cancel_game</c> permission, not gated to any particular list.</summary>
    public bool CanCancelGame { get; init; }

    public bool IsAuthenticated { get; init; }

    public bool OnProbation { get; init; }

    public string EmptyMessage { get; init; } = "There are no games to show.";
}
