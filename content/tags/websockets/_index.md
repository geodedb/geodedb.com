---
title: "WebSocket Support"
description: "Real-time bidirectional communication with Geode using WebSocket protocol"
keywords: ["WebSocket", "WebSockets", "real-time communication", "bidirectional", "push notifications", "live updates", "streaming data", "socket.io"]
weight: 10
---

# WebSocket Support

WebSocket is a protocol providing full-duplex communication channels over a single TCP connection. While Geode primarily uses QUIC for its native protocol, WebSocket support enables real-time, bidirectional communication for web applications and environments where QUIC is not available.

## WebSocket Basics

### What are WebSockets?

WebSockets provide:

**Full-Duplex** - Simultaneous bidirectional communication
**Low Latency** - Minimal overhead after connection established
**Real-Time** - Push updates from server to client
**Persistent** - Long-lived connections

### WebSocket vs HTTP

| Feature | HTTP | WebSocket |
|---------|------|-----------|
| Communication | Request-Response | Bidirectional |
| Connection | Short-lived | Persistent |
| Overhead | High (headers per request) | Low (single handshake) |
| Server Push | No (polling required) | Yes (native) |

## Geode WebSocket API

### Connecting via WebSocket

Establish WebSocket connection:

```javascript
// JavaScript client
const ws = new WebSocket('wss://geode.example.com:8443/ws');

ws.onopen = () => {
  console.log('Connected to Geode');
  
  // Authenticate
  ws.send(JSON.stringify({
    type: 'AUTH',
    token: 'your-jwt-token'
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('Disconnected from Geode');
};
```

### Executing Queries

Run GQL queries over WebSocket:

```javascript
function executeQuery(query, params) {
  const request = {
    type: 'QUERY',
    id: generateRequestId(),
    query: query,
    parameters: params || {}
  };
  
  ws.send(JSON.stringify(request));
}

// Execute query
executeQuery(
  'MATCH (p:Person) WHERE p.age > $age RETURN p',
  { age: 18 }
);

// Handle response
ws.onmessage = (event) => {
  const response = JSON.parse(event.data);
  
  if (response.type === 'RESULT') {
    console.log('Query results:', response.data);
  } else if (response.type === 'ERROR') {
    console.error('Query error:', response.error);
  }
};
```

### Subscription Queries

Subscribe to real-time updates:

```javascript
// Subscribe to changes
const subscribeToUserUpdates = () => {
  ws.send(JSON.stringify({
    type: 'SUBSCRIBE',
    id: 'user-updates',
    query: 'SUBSCRIBE TO users WHERE age > 18'
  }));
};

// Receive subscription updates
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'UPDATE' && message.subscription === 'user-updates') {
    console.log('User updated:', message.data);
    updateUI(message.data);
  }
};

// Unsubscribe
const unsubscribe = (id) => {
  ws.send(JSON.stringify({
    type: 'UNSUBSCRIBE',
    id: id
  }));
};
```

## Use Cases

### Live Dashboards

Update dashboards in real-time:

```javascript
class LiveDashboard {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.setupHandlers();
  }
  
  setupHandlers() {
    this.ws.onopen = () => {
      // Subscribe to metrics
      this.subscribe('system-metrics', 
        'SELECT * FROM metrics EMIT CHANGES'
      );
    };
    
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      
      if (msg.type === 'UPDATE') {
        this.updateMetric(msg.data);
      }
    };
  }
  
  subscribe(id, query) {
    this.ws.send(JSON.stringify({
      type: 'SUBSCRIBE',
      id: id,
      query: query
    }));
  }
  
  updateMetric(data) {
    // Update dashboard UI
    document.getElementById('cpu-usage').textContent = data.cpu + '%';
    document.getElementById('memory-usage').textContent = data.memory + '%';
  }
}

const dashboard = new LiveDashboard('wss://geode.local:8443/ws');
```

### Collaborative Editing

Enable real-time collaboration:

```javascript
class CollaborativeEditor {
  constructor(documentId) {
    this.documentId = documentId;
    this.ws = new WebSocket('wss://geode.local:8443/ws');
    this.setupSync();
  }
  
  setupSync() {
    this.ws.onopen = () => {
      // Join collaboration session
      this.ws.send(JSON.stringify({
        type: 'JOIN_SESSION',
        document_id: this.documentId
      }));
    };
    
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      
      if (msg.type === 'EDIT') {
        this.applyRemoteEdit(msg.edit);
      } else if (msg.type === 'USER_JOINED') {
        this.showUser(msg.user);
      }
    };
  }
  
  sendEdit(edit) {
    this.ws.send(JSON.stringify({
      type: 'EDIT',
      document_id: this.documentId,
      edit: edit
    }));
  }
  
  applyRemoteEdit(edit) {
    // Apply edit from other user
    this.editor.applyChange(edit);
  }
}
```

### Chat Applications

Build real-time chat:

```javascript
class ChatClient {
  constructor(roomId) {
    this.roomId = roomId;
    this.ws = new WebSocket('wss://geode.local:8443/ws');
    this.setupChat();
  }
  
  setupChat() {
    this.ws.onopen = () => {
      // Join chat room
      this.ws.send(JSON.stringify({
        type: 'JOIN_ROOM',
        room_id: this.roomId
      }));
    };
    
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      
      if (msg.type === 'MESSAGE') {
        this.displayMessage(msg);
      } else if (msg.type === 'TYPING') {
        this.showTypingIndicator(msg.user);
      }
    };
  }
  
  sendMessage(text) {
    this.ws.send(JSON.stringify({
      type: 'MESSAGE',
      room_id: this.roomId,
      text: text,
      timestamp: new Date().toISOString()
    }));
  }
  
  sendTypingIndicator() {
    this.ws.send(JSON.stringify({
      type: 'TYPING',
      room_id: this.roomId
    }));
  }
}
```

## Best Practices

### Connection Management

Handle connection lifecycle:

```javascript
class ReliableWebSocket {
  constructor(url) {
    this.url = url;
    this.reconnectDelay = 1000;
    this.maxReconnectDelay = 30000;
    this.connect();
  }
  
  connect() {
    this.ws = new WebSocket(this.url);
    
    this.ws.onopen = () => {
      console.log('Connected');
      this.reconnectDelay = 1000;
      this.onopen?.();
    };
    
    this.ws.onclose = () => {
      console.log('Disconnected, reconnecting...');
      setTimeout(() => {
        this.reconnectDelay = Math.min(
          this.reconnectDelay * 2,
          this.maxReconnectDelay
        );
        this.connect();
      }, this.reconnectDelay);
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    this.ws.onmessage = (event) => {
      this.onmessage?.(event);
    };
  }
  
  send(data) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data);
    } else {
      console.warn('WebSocket not connected');
    }
  }
}
```

### Message Acknowledgment

Ensure reliable delivery:

```javascript
class AcknowledgedWebSocket {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.pendingMessages = new Map();
    this.messageId = 0;
    this.setupHandlers();
  }
  
  setupHandlers() {
    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      
      if (msg.type === 'ACK') {
        // Remove from pending
        this.pendingMessages.delete(msg.message_id);
      } else if (msg.type === 'MESSAGE') {
        // Send acknowledgment
        this.ws.send(JSON.stringify({
          type: 'ACK',
          message_id: msg.id
        }));
        
        this.handleMessage(msg);
      }
    };
  }
  
  send(data, timeout = 5000) {
    const id = ++this.messageId;
    const message = {
      id: id,
      type: 'MESSAGE',
      data: data
    };
    
    return new Promise((resolve, reject) => {
      // Store for retry
      this.pendingMessages.set(id, {
        message: message,
        resolve: resolve,
        reject: reject,
        timeout: setTimeout(() => {
          this.pendingMessages.delete(id);
          reject(new Error('Message timeout'));
        }, timeout)
      });
      
      this.ws.send(JSON.stringify(message));
    });
  }
}
```

## Related Topics

- [Real-Time](/tags/real-time) - Real-time data processing
- [Streaming](/tags/streaming) - Event streaming
- [Pub/Sub](/tags/pubsub) - Publish-subscribe messaging
- [Events](/tags/events) - Event-driven architecture

## Learn More

- [WebSocket API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Socket.IO](https://socket.io/)
- [WebSocket Protocol RFC 6455](https://tools.ietf.org/html/rfc6455)
