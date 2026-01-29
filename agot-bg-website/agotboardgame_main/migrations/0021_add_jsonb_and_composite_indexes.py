# Generated migration for optimizing Game queries

from django.db import migrations, models


class Migration(migrations.Migration):
    atomic = False  # Required for concurrent index creation

    dependencies = [
        ('agotboardgame_main', '0020_add_new_user_fields'),
    ]

    operations = [
        # Add composite indexes for common query patterns
        migrations.AddIndex(
            model_name='game',
            index=models.Index(fields=['state', '-last_active_at'], name='game_state_active_desc_idx'),
        ),
        migrations.AddIndex(
            model_name='game',
            index=models.Index(fields=['state', 'last_active_at'], name='game_state_active_asc_idx'),
        ),
        
        # Add B-tree indexes for JSONB text extraction (used by KeyTextTransform)
        # Using ->> operator to extract text values for B-tree indexing
        # Index for settings.pbem
        migrations.RunSQL(
            sql="CREATE INDEX CONCURRENTLY IF NOT EXISTS game_view_settings_pbem_idx ON agotboardgame_main_game ((view_of_game->'settings'->>'pbem'));",
            reverse_sql="DROP INDEX IF EXISTS game_view_settings_pbem_idx;",
        ),
        # Index for settings.private
        migrations.RunSQL(
            sql="CREATE INDEX CONCURRENTLY IF NOT EXISTS game_view_settings_private_idx ON agotboardgame_main_game ((view_of_game->'settings'->>'private'));",
            reverse_sql="DROP INDEX IF EXISTS game_view_settings_private_idx;",
        ),
        # Index for settings.tournamentMode
        migrations.RunSQL(
            sql="CREATE INDEX CONCURRENTLY IF NOT EXISTS game_view_settings_tournament_idx ON agotboardgame_main_game ((view_of_game->'settings'->>'tournamentMode'));",
            reverse_sql="DROP INDEX IF EXISTS game_view_settings_tournament_idx;",
        ),
        # Index for settings.faceless
        migrations.RunSQL(
            sql="CREATE INDEX CONCURRENTLY IF NOT EXISTS game_view_settings_faceless_idx ON agotboardgame_main_game ((view_of_game->'settings'->>'faceless'));",
            reverse_sql="DROP INDEX IF EXISTS game_view_settings_faceless_idx;",
        ),
        # Index for replacePlayerVoteOngoing
        migrations.RunSQL(
            sql="CREATE INDEX CONCURRENTLY IF NOT EXISTS game_view_replace_vote_idx ON agotboardgame_main_game ((view_of_game->>'replacePlayerVoteOngoing'));",
            reverse_sql="DROP INDEX IF EXISTS game_view_replace_vote_idx;",
        ),
        # Index for created_at (for user profile ordering)
        migrations.AddIndex(
            model_name='game',
            index=models.Index(fields=['-created_at'], name='game_created_at_desc_idx'),
        ),
        # Index for PlayerInGame.data->'is_winner' (for user profile stats)
        migrations.RunSQL(
            sql="CREATE INDEX CONCURRENTLY IF NOT EXISTS playeringame_data_winner_idx ON agotboardgame_main_playeringame ((data->>'is_winner'));",
            reverse_sql="DROP INDEX IF EXISTS playeringame_data_winner_idx;",
        ),
    ]
