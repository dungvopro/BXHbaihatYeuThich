using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using SecureWebSite.Server.Data;
using SecureWebSite.Server.Hubs;
using SecureWebSite.Server.Models;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace SecureWebSite.Server.Controllers
{
    [Route("api/securewebsite")]
    [ApiController]
    public class SecureWebsiteController(SignInManager<User> sm, UserManager<User> um, ApplicationDbContext context, IHubContext<SongHub> hubContext, IConfiguration configuration) : ControllerBase
    {
        private readonly SignInManager<User> signInManager = sm;
        private readonly UserManager<User> userManager = um;
        private readonly ApplicationDbContext dbContext = context;
        private readonly IHubContext<SongHub> hubContext = hubContext;
        private readonly IConfiguration configuration = configuration;

        [HttpPost("songs")]
        [Authorize] // Chỉ cho phép người dùng đã đăng nhập để thêm bài hát
        public async Task<ActionResult> AddSong([FromForm] Song song, IFormFile file)
        {
            try
            {
                if (song == null || string.IsNullOrEmpty(song.Name) || file == null || file.Length == 0)
                {
                    return BadRequest("Song details and file are required.");
                }

                // Đảm bảo thư mục tồn tại
                var uploadsFolder = Path.Combine("wwwroot", "uploads");
                if (!Directory.Exists(uploadsFolder))
                {
                    Directory.CreateDirectory(uploadsFolder);
                }

                // Lưu file mp3 vào thư mục
                var safeFileName = Uri.EscapeDataString(file.FileName);
                var filePath = Path.Combine(uploadsFolder, safeFileName);
                using (var stream = new FileStream(filePath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                // Gán tên file vào thuộc tính Name
                song.Name = safeFileName;// Gán tên file đã mã hóa vào thuộc tính Name
                await dbContext.Songs.AddAsync(song);
                await dbContext.SaveChangesAsync();

                return Ok(new { message = "Song added successfully!", song });
            }
            catch (Exception ex)
            {
                // Ghi lại lỗi vào log
                Console.WriteLine($"Error in AddSong: {ex.Message}");
                return StatusCode(500, "Internal server error. " + ex.Message);
            }
        }
        [HttpGet("songs")]
        public async Task<ActionResult<IEnumerable<Song>>> GetSongs()
        {
            var songs = await dbContext.Songs.ToListAsync();

            var songDtos = songs.Select(song => new
            {
                Id = song.Id,
                Name = song.Name, // Tên file gốc
                Url = $"{Request.Scheme}://{Request.Host}/uploads/{Uri.EscapeDataString(song.Name)}", // Đường dẫn đã mã hóa
                Likes = song.Likes
            }).ToList();

            return Ok(songDtos);
        }

        [HttpPatch("songs/{id}/like")] //không cần đăng nhập vẫn có thể like
        public async Task<IActionResult> LikeSong(int id)
        {
            var song = await dbContext.Songs.FindAsync(id);
            if (song == null)
            {
                return NotFound(new { message = "Song not found" });
            }

            song.Likes += 1; // Tăng số lượng likes
            await dbContext.SaveChangesAsync();

            // Gửi thông báo đến tất cả client thông qua SignalR
            await hubContext.Clients.All.SendAsync("ReceiveLikeUpdate", song.Id, song.Likes);

            return Ok(new { message = "Likes updated successfully", likes = song.Likes });
        }

        [HttpPost("register")]
        public async Task<ActionResult> RegisterUser(User user)
        {

            IdentityResult result = new();

            try
            {
                User user_ = new User()
                {
                    Name = user.Name,
                    Email = user.Email,
                    UserName = user.UserName,
                };

                result = await userManager.CreateAsync(user_, user.PasswordHash);

                if (!result.Succeeded)
                {
                    return BadRequest(result);
                }
            }
            catch (Exception ex)
            {
                return BadRequest("Something went wrong, please try again. " + ex.Message);
            }

            return Ok(new { message = "Registered Successfully.", result = result });
        }

        [HttpPost("login")]
        public async Task<ActionResult> LoginUser(Login login)
        {
            try
            {
                // Tìm người dùng dựa trên email
                var user = await userManager.FindByEmailAsync(login.Email);
                if (user == null)
                {
                    return BadRequest(new { message = "Please check your credentials and try again." });
                }

                // Xác thực người dùng với mật khẩu
                var result = await signInManager.PasswordSignInAsync(user, login.Password, login.Remember, false);
                if (!result.Succeeded)
                {
                    return Unauthorized(new { message = "Check your login credentials and try again." });
                }

                // Tạo token JWT
                var claims = new[]
                {
            new Claim(JwtRegisteredClaimNames.Sub, user.Email), // Sử dụng email làm Subject
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

                var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration["Jwt:Key"]));
                var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

                var token = new JwtSecurityToken(
                    issuer: configuration["Jwt:Issuer"],
                    audience: configuration["Jwt:Audience"],
                    claims: claims,
                    expires: DateTime.Now.AddMinutes(Convert.ToDouble(configuration["Jwt:ExpirationInMinutes"])),
                    signingCredentials: creds);

                // Trả về thông tin phản hồi
                return Ok(new
                {
                    message = "Login Successful.",
                    token = new JwtSecurityTokenHandler().WriteToken(token),
                    user = new
                    {
                        username = user.UserName, // Có thể giữ nguyên hoặc điều chỉnh
                        email = user.Email
                    }
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Something went wrong, please try again. " + ex.Message });
            }
        }

        [HttpPost("logout"), Authorize]
        public async Task<ActionResult> LogoutUser()
        {
            try
            {
                // Lấy token từ header
                var token = HttpContext.Request.Headers["Authorization"].FirstOrDefault()?.Split(" ").Last();
                if (string.IsNullOrEmpty(token))
                {
                    return BadRequest(new { message = "Token not provided" });
                }

                // Lấy thông tin người dùng từ token
                var handler = new JwtSecurityTokenHandler();
                var jsonToken = handler.ReadToken(token) as JwtSecurityToken;
                var userEmail = jsonToken?.Claims.First(claim => claim.Type == "email").Value;

                if (string.IsNullOrEmpty(userEmail))
                {
                    return BadRequest(new { message = "Invalid token" });
                }

                // Thêm token vào blacklist hoặc revoke token (cần triển khai)
                // await _tokenBlacklistService.AddToBlacklistAsync(token);

                return Ok(new { message = "Logged out successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Something went wrong, please try again. " + ex.Message });
            }
        }

        [HttpGet("admin"), Authorize]
        public ActionResult AdminPage()
        {
            string[] partners = { "Raja", "Bill Gates", "Elon Musk", "Taylor Swift", "Jeff Bezoss",
                                        "Mark Zuckerberg", "Joe Biden", "Putin"};

            return Ok(new { trustedPartners = partners });
        }

        [HttpGet("home/{email}"), Authorize]
        public async Task<ActionResult> HomePage(string email)
        {
            User userInfo = await userManager.FindByEmailAsync(email);
            if (userInfo == null)
            {
                return BadRequest(new { message = "Something went wrong, please try again." });
            }

            return Ok(new { userInfo = userInfo });
        }

        [HttpGet("xhtlekd")]
        public async Task<ActionResult> CheckUser()
        {
            try
            {
                // Kiểm tra xem người dùng đã được xác thực chưa
                if (!User.Identity.IsAuthenticated)
                {
                    return Unauthorized(new { message = "User is not authenticated." });
                }

                // Lấy email của người dùng từ claims
                var userEmail = User.FindFirstValue(ClaimTypes.Email);
                if (string.IsNullOrEmpty(userEmail))
                {
                    return BadRequest(new { message = "User email not found in claims." });
                }

                // Lấy người dùng từ UserManager bằng email
                var currentUser = await userManager.FindByEmailAsync(userEmail);
                if (currentUser == null)
                {
                    return NotFound(new { message = "User not found." });
                }

                return Ok(new { message = "Logged in", user = currentUser });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in CheckUser: {ex.Message}");
                return StatusCode(500, new { message = "Internal server error occurred.", error = ex.Message });
            }
        }

    }
}
