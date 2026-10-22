using System.Text.Json;
using agot_bg_website.Domain;
using agot_bg_website.Services.GameListing;
using Xunit;

namespace agot_bg_website.Tests.Services;

public class GameSettingsDisplayTests
{
    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void EmpoweredVassals_ShownOnlyWhenEnabled(bool enabled)
    {
        using var view = JsonSerializer.SerializeToDocument(
            new { settings = new { pbem = true, empoweredVassals = enabled } }
        );

        var labels = GameSettingsDisplay.GetEnabledSettingLabels(view, GameState.InLobby);

        Assert.Equal(
            enabled ? ["Play By E-Mail", "Custom: Empowered Vassals"] : ["Play By E-Mail"],
            labels
        );
    }
}
