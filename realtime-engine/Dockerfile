FROM golang:1.21-alpine
WORKDIR /app

# Copy the Go source code
COPY realtime-engine/ .

# Initialize/Tidy the module (this generates go.sum inside the container)
RUN go mod tidy

# Build the Go app
RUN go build -o main .

# Expose port 8080 to the outside world
EXPOSE 8080

# Command to run the executable
CMD ["./main"]
