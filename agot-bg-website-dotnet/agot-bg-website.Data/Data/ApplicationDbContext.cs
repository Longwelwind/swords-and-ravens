using System.Text.Json;
using agot_bg_website.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace agot_bg_website.Data
{
    /// <summary>
    /// Fresh code-first schema, see MIGRATION_PLAN.md §4. Uses Guid keys throughout, except
    /// Message.Id (a plain long/bigint, matching Django's chat_message.id AutoField widened for
    /// headroom) so imported legacy ids can be preserved during the data migration - see
    /// Importer.ImportMessagesAsync.
    /// </summary>
    public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>(options)
    {
        public DbSet<Game> Games => Set<Game>();

        public DbSet<PlayerInGame> PlayersInGame => Set<PlayerInGame>();

        public DbSet<PreviousPlayerInGame> PreviousPlayersInGame => Set<PreviousPlayerInGame>();

        public DbSet<PbemResponseTime> PbemResponseTimes => Set<PbemResponseTime>();

        public DbSet<Room> Rooms => Set<Room>();

        public DbSet<Message> Messages => Set<Message>();

        public DbSet<UserInRoom> UsersInRoom => Set<UserInRoom>();

        // EF Core has no built-in mapping for System.Text.Json.JsonDocument (it looks like a
        // complex/owned type to the model builder otherwise, which fails at model-build time with
        // "No suitable constructor was found for type 'JsonDocument'"). Store it as text/jsonb
        // instead and round-trip through JsonDocument.Parse/RootElement.GetRawText().
        private static readonly ValueConverter<JsonDocument?, string?> JsonDocumentConverter = new(
            doc => doc == null ? null : doc.RootElement.GetRawText(),
            json => json == null ? null : JsonDocument.Parse(json, default)
        );

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<ApplicationUser>(user =>
            {
                user.Ignore(u => u.PhoneNumber);
                user.Ignore(u => u.PhoneNumberConfirmed);
                user.Ignore(u => u.DisplayName);
                user.Property(u => u.GameToken).HasMaxLength(64).IsRequired();
                user.HasIndex(u => u.GameToken).IsUnique();
                user.Property(u => u.EmailGameNotificationsActive).HasDefaultValue(true);
                user.Property(u => u.EmailCombatNotificationsActive).HasDefaultValue(true);
                user.Property(u => u.EmailVoteGameEndNotificationsActive).HasDefaultValue(true);
                user.Property(u => u.EmailPrivateMessageNotificationsActive).HasDefaultValue(true);
            });

            builder.Entity<Game>(game =>
            {
                game.Property(g => g.Name).HasMaxLength(200).IsRequired();
                game.Property(g => g.State).HasConversion<string>().HasMaxLength(20);
                game.Property(g => g.SerializedGame)
                    .HasConversion(JsonDocumentConverter)
                    .HasColumnType("jsonb");
                game.Property(g => g.ViewOfGame)
                    .HasConversion(JsonDocumentConverter)
                    .HasColumnType("jsonb");
                game.HasOne(g => g.OwnerUser)
                    .WithMany()
                    .HasForeignKey(g => g.OwnerUserId)
                    .OnDelete(DeleteBehavior.Restrict);
                game.HasIndex(g => g.State);
            });

            builder.Entity<PlayerInGame>(pig =>
            {
                pig.Property(p => p.Data)
                    .HasConversion(JsonDocumentConverter)
                    .HasColumnType("jsonb");
                pig.HasOne(p => p.Game)
                    .WithMany(g => g.Players)
                    .HasForeignKey(p => p.GameId)
                    .OnDelete(DeleteBehavior.Cascade);
                pig.HasOne(p => p.User)
                    .WithMany()
                    .HasForeignKey(p => p.UserId)
                    .OnDelete(DeleteBehavior.Restrict);
                pig.HasIndex(p => new { p.GameId, p.UserId }).IsUnique();
            });

            builder.Entity<PreviousPlayerInGame>(ppig =>
            {
                ppig.Property(p => p.Reason).HasConversion<string>().HasMaxLength(30);
                ppig.HasOne(p => p.Game)
                    .WithMany(g => g.PreviousPlayers)
                    .HasForeignKey(p => p.GameId)
                    .OnDelete(DeleteBehavior.Cascade);
                ppig.HasOne(p => p.User)
                    .WithMany()
                    .HasForeignKey(p => p.UserId)
                    .OnDelete(DeleteBehavior.Restrict);
                // At most one "currently removed" row per user per game - see the entity's doc
                // comment (re-added if the user leaves again after being voted back in).
                ppig.HasIndex(p => new { p.GameId, p.UserId }).IsUnique();
            });

            builder.Entity<PbemResponseTime>(prt =>
            {
                prt.HasOne(p => p.User)
                    .WithMany()
                    .HasForeignKey(p => p.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            builder.Entity<Room>(room =>
            {
                room.Property(r => r.Name).HasMaxLength(200).IsRequired();
            });

            builder.Entity<Message>(message =>
            {
                message.Property(m => m.Text).HasMaxLength(200).IsRequired();
                // Message.Id intentionally mirrors Django's chat_message.id (an AutoField -
                // confirmed via information_schema against the legacy database to be a plain
                // 32-bit int there - not a Guid like every other entity here) so imported legacy
                // ids can be preserved exactly, same as User.Id/Game.Id/Room.Id. Widened to long
                // here rather than kept as int, since a 32-bit int would eventually risk overflow
                // for a table that already holds 2M+ rows and only ever grows. EF Core's Npgsql
                // provider defaults int/long PKs to "GENERATED BY DEFAULT AS IDENTITY", which
                // (unlike ALWAYS) still lets the importer insert its own explicit Id values - see
                // Importer.ImportMessagesAsync, which must bump the underlying sequence after
                // doing so.
                message
                    .HasOne(m => m.Room)
                    .WithMany(r => r.Messages)
                    .HasForeignKey(m => m.RoomId)
                    .OnDelete(DeleteBehavior.Cascade);
                message
                    .HasOne(m => m.User)
                    .WithMany()
                    .HasForeignKey(m => m.UserId)
                    .OnDelete(DeleteBehavior.Restrict);
                message.HasIndex(m => new { m.RoomId, m.CreatedAt });
            });

            builder.Entity<UserInRoom>(uir =>
            {
                uir.HasOne(u => u.User)
                    .WithMany()
                    .HasForeignKey(u => u.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                uir.HasOne(u => u.Room)
                    .WithMany(r => r.UsersInRoom)
                    .HasForeignKey(u => u.RoomId)
                    .OnDelete(DeleteBehavior.Cascade);
                uir.HasIndex(u => new { u.UserId, u.RoomId }).IsUnique();
            });
        }
    }
}
