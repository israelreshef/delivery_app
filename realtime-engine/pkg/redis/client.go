package redis

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/redis/go-redis/v9"
)

var Ctx = context.Background()

func InitClient() *redis.Client {
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}

	client := redis.NewClient(&redis.Options{
		Addr:     redisAddr,
		Password: "", // No password set
		DB:       0,  // Use default DB
	})

	_, err := client.Ping(Ctx).Result()
	if err != nil {
		log.Printf("Warning: Failed to connect to Redis at %s: %v", redisAddr, err)
	} else {
		fmt.Printf("Connected to Redis at %s\n", redisAddr)
	}

	return client
}
