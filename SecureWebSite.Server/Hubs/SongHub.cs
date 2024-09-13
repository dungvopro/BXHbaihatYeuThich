using Microsoft.AspNetCore.SignalR;

namespace SecureWebSite.Server.Hubs
{
    public class SongHub : Hub
    {
        public async Task SendLikeUpdate(int songId, int likes)
        {
            await Clients.All.SendAsync("ReceiveLikeUpdate", songId, likes);
        }
    }
}
