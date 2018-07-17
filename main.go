package main

import (
	"encoding/json"
	"math/rand"
	"time"
	"strings"
	"log"
	"golang.org/x/net/websocket"
	"net/http"
)

/* variables */
const Url 		= "localhost:4000"
var 	Clients = make(map[Client]int)

/* router */
func init() {
	http.Handle("/sock/", websocket.Handler(SockServer))
	http.Handle("/", http.StripPrefix("/", http.FileServer(http.Dir("static"))))
	http.HandleFunc("/getGameID/", GetGameID)
}

/* start server */
func main() {
	err := http.ListenAndServe(Url, nil)
	if err != nil {
		panic("ListenAndServe: " + err.Error())
	}
}

/* models */
type Client struct {
	WebSocket	*websocket.Conn
	ClientIP 	string
  GameID 		string
}

type Status struct {
  Type 				string `json:"type"`
	ClientIP		string `json:"clientIP"'`
	PlayerCount int 	 `json:"playerCount"'`
}

type Cell struct {
	I    int `json:"i"`
	J    int `json:"j"`
}

type Msg struct {
  Type 							string 	`json:"type"`
	ClientIP					string 	`json:"clientIP"'`
  I    							int 		`json:"i"`
	J    							int			`json:"j"`
	RevealedLocations []Cell  `json:"revealedLocations"`
	BeeLocations  		[]Cell  `json:"beeLocations"`
}

/* handlers */
func SockServer(ws *websocket.Conn) {
  // add the current client to the clients list
	var urlParts = strings.Split(ws.Request().URL.Path, "/")
	var gameID = urlParts[2]
	var currentClient = Client{
    ws,
    ws.Request().RemoteAddr,
    gameID,
  }
	Clients[currentClient] = 0

	// count the players
	var playerCount = 0
	for client, _ := range Clients {
		if client.GameID == gameID {
			playerCount++
		}
	}

  // send the initial state to this client
	websocket.JSON.Send(currentClient.WebSocket, Status{
    "setup",
    ws.Request().RemoteAddr,
    playerCount,
  })

  // send the details of the player that joined
	log.Println("player joined: ", ws.Request().RemoteAddr)
	for client, _ := range Clients {
		if client.GameID == gameID {
			websocket.JSON.Send(client.WebSocket, Status{
        "playerJoined",
        ws.Request().RemoteAddr,
        playerCount,
      })
		}
	}

  // create an inifinate for loop that is waiting for messages
	for {
    var err error
  	var msg Msg

		if err = websocket.JSON.Receive(ws, &msg); err != nil {
			log.Println("cant read message so player has left", err.Error())
			delete(Clients, currentClient)

			for client, _ := range Clients {
				if client.GameID == gameID {
					websocket.JSON.Send(client.WebSocket, Status{
            "playerLeft",
            ws.Request().RemoteAddr,
            playerCount,
          })
				}
			}
			return
		}

		for client, _ := range Clients {
			if client.GameID == gameID {
				websocket.JSON.Send(client.WebSocket, msg)
			}
		}
	}
}

func GetGameID(w http.ResponseWriter, r *http.Request) {
	const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
	random := rand.New(rand.NewSource(time.Now().UnixNano()))
	result := make([]byte, 5)
	for i := range result {
		result[i] = chars[random.Intn(len(chars))]
	}
  json.NewEncoder(w).Encode(string(result))
}
