package main

import (
	"log"
	"realtime-engine/pkg/geo"
	"realtime-engine/pkg/redis"

	"github.com/gin-gonic/gin"
)

func main() {
	// Initialize Redis
	redisClient := redis.InitClient()
	defer redisClient.Close()

	// Initialize Router
	r := gin.Default()

	// Routes
	r.POST("/location", geo.HandleLocationUpdate(redisClient))

	// Start Server
	log.Println("Starting Real-time Engine on :8080")
	r.Run(":8080")
}
