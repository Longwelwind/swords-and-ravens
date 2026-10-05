namespace agot_bg_website.Services.GameListing;

/// <summary>
/// The "Last finished game" link shown above the online-users list on Games/MyGames, mirroring
/// Django's `last_finished_game` context variable (games.html/my_games.html).
/// </summary>
public sealed record LastFinishedGame(Guid Id, string Name, int PlayersCount, int? MaxPlayerCount);

/// <summary>
/// One row of any of the games lists (open/ongoing/my games/inactive.../replacement needed) —
/// the ASP.NET Core equivalent of the context Django's games_table.html template renders per
/// `game`, but pre-computed in C# instead of doing JSON lookups inside the template.
/// </summary>
public sealed record GameListItem(
    Guid Id,
    string Name,
    Domain.GameState State,
    Guid OwnerUserId,
    string? OwnerDisplayName,
    int PlayersCount,
    int? MaxPlayerCount,
    bool IsPbem,
    bool IsPasswordProtected,
    bool IsPrivate,
    bool IsFaceless,
    DateTimeOffset CreatedAt,
    DateTimeOffset LastActiveAt,
    int? Turn,
    string? WaitingFor,
    // Personalization for the current viewer, null/false if not authenticated or not a player.
    string? MyHouse,
    bool MyTurn,
    bool MyNeededForVote,
    bool UnreadPublicMessages,
    bool UnreadPrivateMessages,
    // "Replacement needed for: Stark (username), ..." - null unless there's an inactive waited-for player.
    string? ReplacementNeededFor,
    // First inactive waited-for player's user id, for the admin-only "join as ..." action.
    Guid? JoinAsUserId,
    // Friendly setup name and every true boolean setting's friendly label, for the settings-gear
    // popup - see GameSettingsDisplay.
    string SetupName,
    IReadOnlyList<string> EnabledSettingLabels
)
{
    /// <summary>The host's name as it may be shown publicly in any games list - null for a
    /// faceless game, since naming the host would reveal the identity of at least one of its
    /// players.</summary>
    public string? PublicOwnerDisplayName => IsFaceless ? null : OwnerDisplayName;
}
