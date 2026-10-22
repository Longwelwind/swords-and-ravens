using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace agot_bg_website.Data.Migrations;

public partial class AddEmailNotificationCategories : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<bool>(
            name: "EmailGameNotificationsActive",
            table: "AspNetUsers",
            type: "boolean",
            nullable: false,
            defaultValue: true
        );

        migrationBuilder.AddColumn<bool>(
            name: "EmailCombatNotificationsActive",
            table: "AspNetUsers",
            type: "boolean",
            nullable: false,
            defaultValue: true
        );

        migrationBuilder.AddColumn<bool>(
            name: "EmailVoteGameEndNotificationsActive",
            table: "AspNetUsers",
            type: "boolean",
            nullable: false,
            defaultValue: true
        );

        migrationBuilder.AddColumn<bool>(
            name: "EmailPrivateMessageNotificationsActive",
            table: "AspNetUsers",
            type: "boolean",
            nullable: false,
            defaultValue: true
        );
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "EmailGameNotificationsActive", table: "AspNetUsers");
        migrationBuilder.DropColumn(name: "EmailCombatNotificationsActive", table: "AspNetUsers");
        migrationBuilder.DropColumn(
            name: "EmailVoteGameEndNotificationsActive",
            table: "AspNetUsers"
        );
        migrationBuilder.DropColumn(
            name: "EmailPrivateMessageNotificationsActive",
            table: "AspNetUsers"
        );
    }
}
