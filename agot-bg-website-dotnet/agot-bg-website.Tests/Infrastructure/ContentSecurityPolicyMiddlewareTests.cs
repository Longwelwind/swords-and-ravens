using agot_bg_website.Infrastructure;
using Microsoft.AspNetCore.Http;
using Xunit;

namespace agot_bg_website.Tests.Infrastructure;

public class ContentSecurityPolicyMiddlewareTests
{
    [Fact]
    public void GetCspNonce_WithoutMiddleware_ReturnsNull()
    {
        Assert.Null(new DefaultHttpContext().GetCspNonce());
    }
}
