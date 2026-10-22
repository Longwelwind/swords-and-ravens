// Licensed to the .NET Foundation under one or more agreements.
// The .NET Foundation licenses this file to you under the MIT license.
#nullable disable

using System.ComponentModel.DataAnnotations;
using agot_bg_website.Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace agot_bg_website.Areas.Identity.Pages.Account.Manage
{
    public class IndexModel(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager
    ) : PageModel
    {
        private readonly UserManager<ApplicationUser> _userManager = userManager;
        private readonly SignInManager<ApplicationUser> _signInManager = signInManager;

        /// <summary>
        ///     This API supports the ASP.NET Core Identity default UI infrastructure and is not intended to be used
        ///     directly from your code. This API may change or be removed in future releases.
        /// </summary>
        public string Username { get; set; }

        public bool CanChangeUsername { get; set; }

        public DateTimeOffset? LastUsernameUpdateTime { get; set; }

        /// <summary>
        ///     This API supports the ASP.NET Core Identity default UI infrastructure and is not intended to be used
        ///     directly from your code. This API may change or be removed in future releases.
        /// </summary>
        [TempData]
        public string StatusMessage { get; set; }

        /// <summary>
        ///     This API supports the ASP.NET Core Identity default UI infrastructure and is not intended to be used
        ///     directly from your code. This API may change or be removed in future releases.
        /// </summary>
        [BindProperty]
        public InputModel Input { get; set; }

        [BindProperty]
        public ProfileTextInputModel ProfileTextInput { get; set; }

        [BindProperty]
        public PreferencesInputModel PreferencesInput { get; set; }

        /// <summary>
        ///     This API supports the ASP.NET Core Identity default UI infrastructure and is not intended to be used
        ///     directly from your code. This API may change or be removed in future releases.
        /// </summary>
        public class InputModel
        {
            [StringLength(
                30,
                MinimumLength = 3,
                ErrorMessage = "The {0} must be between {2} and {1} characters long."
            )]
            [RegularExpression(
                Infrastructure.Auth.UsernamePolicy.Pattern,
                ErrorMessage = Infrastructure.Auth.UsernamePolicy.ErrorMessage
            )]
            [Display(Name = "Username")]
            public string NewUsername { get; set; }
        }

        public class ProfileTextInputModel
        {
            [StringLength(1000)]
            [Display(Name = "Say something about you")]
            public string ProfileText { get; set; }
        }

        public class PreferencesInputModel
        {
            [Display(Name = "Email notifications")]
            public bool EmailNotificationActive { get; set; }

            [Display(Name = "Game alerts (ready to start, your turn)")]
            public bool EmailGameNotificationsActive { get; set; }

            [Display(Name = "Combat alerts (support requests, battle results)")]
            public bool EmailCombatNotificationsActive { get; set; }

            [Display(Name = "Vote and game-ended alerts")]
            public bool EmailVoteGameEndNotificationsActive { get; set; }

            [Display(Name = "Private message alerts")]
            public bool EmailPrivateMessageNotificationsActive { get; set; }

            [Display(Name = "Join games in the muted state")]
            public bool MuteGames { get; set; }

            [Display(Name = "Join games by using house names for in-game chat")]
            public bool UseHouseNamesForChat { get; set; }

            [Display(Name = "Join games by using the map scrollbar")]
            public bool UseMapScrollbar { get; set; }

            [Display(Name = "Align the game state column on the right (Desktop only)")]
            public bool GameStateColumnRight { get; set; }
        }

        private async Task LoadAsync(ApplicationUser user)
        {
            var userName = await _userManager.GetUserNameAsync(user);

            Username = userName;
            LastUsernameUpdateTime = user.LastUsernameUpdateTime;
            CanChangeUsername = user.LastUsernameUpdateTime == null;

            Input = new InputModel { NewUsername = userName };
            ProfileTextInput = new ProfileTextInputModel { ProfileText = user.ProfileText };
            PreferencesInput = new PreferencesInputModel
            {
                EmailNotificationActive = user.EmailNotificationActive,
                EmailGameNotificationsActive = user.EmailGameNotificationsActive,
                EmailCombatNotificationsActive = user.EmailCombatNotificationsActive,
                EmailVoteGameEndNotificationsActive = user.EmailVoteGameEndNotificationsActive,
                EmailPrivateMessageNotificationsActive =
                    user.EmailPrivateMessageNotificationsActive,
                MuteGames = user.MuteGames,
                UseHouseNamesForChat = user.UseHouseNamesForChat,
                UseMapScrollbar = user.UseMapScrollbar,
                GameStateColumnRight = user.GameStateColumnRight,
            };
        }

        public async Task<IActionResult> OnGetAsync()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return NotFound($"Unable to load user with ID '{_userManager.GetUserId(User)}'.");
            }

            await LoadAsync(user);
            return Page();
        }

        public async Task<IActionResult> OnPostAsync()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return NotFound($"Unable to load user with ID '{_userManager.GetUserId(User)}'.");
            }

            if (!ModelState.IsValid)
            {
                await LoadAsync(user);
                return Page();
            }

            if (
                user.LastUsernameUpdateTime == null
                && !string.IsNullOrWhiteSpace(Input.NewUsername)
                && Input.NewUsername != user.UserName
            )
            {
                if (Infrastructure.Auth.ReservedUsernames.IsReserved(Input.NewUsername))
                {
                    ModelState.AddModelError(
                        "Input.NewUsername",
                        "This username is reserved and can't be used."
                    );
                    await LoadAsync(user);
                    return Page();
                }

                var existing = await _userManager.FindByNameAsync(Input.NewUsername);
                if (existing != null && existing.Id != user.Id)
                {
                    ModelState.AddModelError(
                        "Input.NewUsername",
                        "This username is already taken."
                    );
                    await LoadAsync(user);
                    return Page();
                }

                var setUserNameResult = await _userManager.SetUserNameAsync(
                    user,
                    Input.NewUsername
                );
                if (!setUserNameResult.Succeeded)
                {
                    foreach (var error in setUserNameResult.Errors)
                    {
                        ModelState.AddModelError(string.Empty, error.Description);
                    }
                    await LoadAsync(user);
                    return Page();
                }

                user.LastUsernameUpdateTime = DateTimeOffset.UtcNow;
                await _userManager.UpdateAsync(user);
                await _signInManager.RefreshSignInAsync(user);
                StatusMessage =
                    "Your username has been updated. (Username can only be changed once.)";
                return RedirectToPage();
            }

            await _signInManager.RefreshSignInAsync(user);
            StatusMessage = "Your profile has been updated";
            return RedirectToPage();
        }

        public async Task<IActionResult> OnPostUpdateProfileTextAsync()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return NotFound($"Unable to load user with ID '{_userManager.GetUserId(User)}'.");
            }

            if (!ModelState.IsValid)
            {
                await LoadAsync(user);
                return Page();
            }

            user.ProfileText = ProfileTextInput.ProfileText;
            await _userManager.UpdateAsync(user);

            StatusMessage = "Your profile text has been updated";
            return RedirectToPage();
        }

        public async Task<IActionResult> OnPostUpdatePreferencesAsync()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return NotFound($"Unable to load user with ID '{_userManager.GetUserId(User)}'.");
            }

            if (!ModelState.IsValid)
            {
                await LoadAsync(user);
                return Page();
            }

            user.EmailNotificationActive = PreferencesInput.EmailNotificationActive;
            user.EmailGameNotificationsActive = PreferencesInput.EmailGameNotificationsActive;
            user.EmailCombatNotificationsActive = PreferencesInput.EmailCombatNotificationsActive;
            user.EmailVoteGameEndNotificationsActive =
                PreferencesInput.EmailVoteGameEndNotificationsActive;
            user.EmailPrivateMessageNotificationsActive =
                PreferencesInput.EmailPrivateMessageNotificationsActive;
            user.MuteGames = PreferencesInput.MuteGames;
            user.UseHouseNamesForChat = PreferencesInput.UseHouseNamesForChat;
            user.UseMapScrollbar = PreferencesInput.UseMapScrollbar;
            user.GameStateColumnRight = PreferencesInput.GameStateColumnRight;
            var updateResult = await _userManager.UpdateAsync(user);
            if (!updateResult.Succeeded)
            {
                foreach (var error in updateResult.Errors)
                {
                    ModelState.AddModelError(string.Empty, error.Description);
                }
                await LoadAsync(user);
                return Page();
            }

            StatusMessage = "Your preferences have been updated";
            return RedirectToPage();
        }
    }
}
