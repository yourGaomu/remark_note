package middlewares

import (
	"net"
	"net/url"
	"strings"

	"github.com/mayswind/ezbookkeeping/pkg/core"
)

const corsAllowedHeaders = "Accept, Authorization, Content-Type, X-Skip-Refresh, X-Timezone-Name, X-Timezone-Offset"
const corsAllowedMethods = "GET, POST, PUT, PATCH, DELETE, OPTIONS"

// CORS enables browser clients hosted on a local or private network origin to
// call the API. The mobile Expo Web client is served from localhost during
// development, so the browser sends an OPTIONS preflight before JSON requests.
// Without handling that preflight, Gin falls through to the JSON 404 handler
// and the browser reports a generic network error to the app.
func CORS(c *core.WebContext) {
	origin := strings.TrimSpace(c.GetHeader("Origin"))

	if origin == "" || !isAllowedDevelopmentOrigin(origin) {
		c.Next()
		return
	}

	c.Header("Access-Control-Allow-Origin", origin)
	c.Header("Access-Control-Allow-Credentials", "true")
	c.Header("Access-Control-Allow-Methods", corsAllowedMethods)
	c.Header("Access-Control-Allow-Headers", corsAllowedHeaders)
	c.Header("Access-Control-Expose-Headers", "X-Request-ID")
	c.Header("Access-Control-Max-Age", "600")
	c.Header("Vary", "Origin")

	if c.Request.Method == "OPTIONS" {
		c.AbortWithStatus(204)
		return
	}

	c.Next()
}

func isAllowedDevelopmentOrigin(origin string) bool {
	parsed, err := url.Parse(origin)

	if err != nil || parsed.User != nil || parsed.Hostname() == "" {
		return false
	}

	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return false
	}

	host := strings.ToLower(parsed.Hostname())

	if host == "localhost" {
		return true
	}

	ip := net.ParseIP(host)

	return ip != nil && (ip.IsLoopback() || ip.IsPrivate())
}
