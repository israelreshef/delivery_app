package geo

import (
	"net/http"
	"realtime-engine/pkg/redis"
	"time"

	"github.com/gin-gonic/gin"
	goredis "github.com/redis/go-redis/v9"
)

type LocationUpdate struct {
	CourierID string  `json:"courier_id" binding:"required"`
	Latitude  float64 `json:"latitude" binding:"required"`
	Longitude float64 `json:"longitude" binding:"required"`
}

func HandleLocationUpdate(client *goredis.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		var update LocationUpdate
		if err := c.ShouldBindJSON(&update); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// 1. GEOADD: Update spatial index
		// Key: "courier_locations"
		err := client.GeoAdd(redis.Ctx, "courier_locations", &goredis.GeoLocation{
			Name:      update.CourierID,
			Longitude: update.Longitude,
			Latitude:  update.Latitude,
		}).Err()

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update location"})
			return
		}

		// 2. SET: Update courier metadata with TTL (e.g., last seen)
		// Key: "courier:123:last_seen"
		client.Set(redis.Ctx, "courier:"+update.CourierID+":last_seen", time.Now().Unix(), 1*time.Minute)

		c.JSON(http.StatusOK, gin.H{
			"status": "success", 
			"server": "Go Real-time Engine",
		})
	}
}
