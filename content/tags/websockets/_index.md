---
title: "WebSocket Support"
description: "Comprehensive guide to real-time bidirectional communication with Geode using WebSocket protocol. Covers WebSocket API, subscriptions, live dashboards, collaborative editing, chat applications, connection management, message acknowledgment, security patterns, and production deployment for browser-based and real-time applications."
keywords:
  - WebSocket
  - WebSockets
  - real-time communication
  - bidirectional
  - push notifications
  - live updates
  - streaming data
  - socket.io
  - server push
  - pub/sub
  - event streams
  - real-time data
  - websocket security
  - ws protocol
  - full-duplex
weight: 10
draft: false
params:
  seo:
    canonical: "https://geodedb.com/tags/websockets/"
    noindex: false
    og_type: "article"
    og_image: "https://geodedb.com/images/websockets.png"
    article:
      published_time: "2025-01-24T10:00:00Z"
      modified_time: "2025-01-24T10:00:00Z"
      section: "Networking"
      tags: ["WebSocket", "real-time", "networking", "browser", "communication"]
---

# WebSocket Support in Geode

WebSocket protocol revolutionizes real-time communication between browsers and servers by providing full-duplex, bidirectional channels over a single TCP connection. While Geode primarily uses QUIC for optimal performance, WebSocket support enables seamless integration with web applications, browser-based clients, and environments where QUIC is unavailable. This comprehensive guide explores WebSocket implementation in Geode, covering real-time subscriptions, live dashboards, collaborative editing, security patterns, and production deployment strategies.

## Understanding WebSocket Architecture

Traditional HTTP follows a strict request-response model: clients send requests, servers respond, connection closes. This architecture works well for static content but creates significant challenges for real-time applications. Developers resort to inefficient workarounds like polling (repeatedly asking "anything new?"), long-polling (holding connections open), or Server-Sent Events (one-way server-to-client).

WebSocket solves these limitations by establishing a persistent, bidirectional connection. After an initial HTTP handshake to upgrade the connection, both client and server can send messages at any time without request-response overhead. This enables true real-time communication with minimal latency.

**WebSocket Advantages**:
- **Bidirectional**: Both client and server can initiate messages
- **Low Latency**: No HTTP request overhead after initial handshake
- **Efficient**: Single persistent connection instead of repeated requests
- **Real-Time**: Server can push updates immediately when data changes
- **Standardized**: RFC 6455 protocol with broad browser and library support

**When to Use WebSocket with Geode**:
- Browser-based applications requiring real-time updates
- Live dashboards displaying changing metrics
- Collaborative editing where multiple users modify shared data
- Chat applications with instant message delivery
- Notification systems pushing alerts to clients
- Event streaming from database changes to UI

**When to Use QUIC Instead**:
- Backend services and microservices (QUIC provides better performance)
- Mobile applications (QUIC handles network transitions better)
- High-throughput scenarios (QUIC's multiplexing excels)
- Low-latency requirements (QUIC's 0-RTT resumption is faster)

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

## Advanced WebSocket Patterns

### Request-Response Pattern

Implement request-response over WebSocket:

```javascript
class WebSocketRPC {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.pending = new Map();
    this.requestId = 0;

    this.ws.onmessage = (event) => {
      const response = JSON.parse(event.data);
      const pending = this.pending.get(response.id);

      if (pending) {
        if (response.error) {
          pending.reject(new Error(response.error));
        } else {
          pending.resolve(response.result);
        }
        this.pending.delete(response.id);
      }
    };
  }

  async call(method, params) {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      this.pending.set(id, { resolve, reject });

      this.ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: id,
        method: method,
        params: params
      }));

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }
}

// Usage
const rpc = new WebSocketRPC('wss://geode.example.com/ws');
const result = await rpc.call('query', {
  gql: 'MATCH (p:Person) RETURN COUNT(p)',
  params: {}
});
console.log('Count:', result.data[0].count);
```

### Multiplexed Channels

Support multiple logical channels over one WebSocket:

```javascript
class MultiplexedWebSocket {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.channels = new Map();

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      const channel = this.channels.get(message.channel);

      if (channel) {
        channel.onmessage(message.data);
      }
    };
  }

  createChannel(name) {
    const channel = {
      name: name,
      send: (data) => {
        this.ws.send(JSON.stringify({
          channel: name,
          data: data
        }));
      },
      onmessage: null,
      close: () => {
        this.channels.delete(name);
      }
    };

    this.channels.set(name, channel);
    return channel;
  }
}

// Usage
const mux = new MultiplexedWebSocket('wss://geode.example.com/ws');

// Create separate channels for different purposes
const queryChannel = mux.createChannel('queries');
const notificationChannel = mux.createChannel('notifications');
const metricsChannel = mux.createChannel('metrics');

queryChannel.onmessage = (data) => {
  console.log('Query result:', data);
};

notificationChannel.onmessage = (data) => {
  showNotification(data.message);
};

metricsChannel.onmessage = (data) => {
  updateDashboard(data.metrics);
};
```

### Binary Protocol Support

Send binary data over WebSocket for efficiency:

```javascript
class BinaryWebSocket {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.ws.binaryType = 'arraybuffer';

    this.ws.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        this.handleBinaryMessage(event.data);
      } else {
        this.handleTextMessage(event.data);
      }
    };
  }

  sendBinaryQuery(query) {
    // Encode query as binary protocol
    const encoder = new TextEncoder();
    const queryBytes = encoder.encode(query);

    // Create header: [version(1), type(1), length(4)]
    const header = new ArrayBuffer(6);
    const view = new DataView(header);
    view.setUint8(0, 1);  // Protocol version
    view.setUint8(1, 1);  // Message type: QUERY
    view.setUint32(2, queryBytes.length);

    // Concatenate header and query
    const message = new Uint8Array(header.byteLength + queryBytes.length);
    message.set(new Uint8Array(header), 0);
    message.set(queryBytes, header.byteLength);

    this.ws.send(message.buffer);
  }

  handleBinaryMessage(buffer) {
    const view = new DataView(buffer);
    const version = view.getUint8(0);
    const type = view.getUint8(1);
    const length = view.getUint32(2);

    // Decode based on type
    if (type === 2) {  // RESULT
      const decoder = new TextDecoder();
      const payload = buffer.slice(6, 6 + length);
      const result = JSON.parse(decoder.decode(payload));
      this.onresult(result);
    }
  }
}
```

## Production Deployment

### Load Balancing WebSockets

Configure load balancer for WebSocket sticky sessions:

```nginx
# nginx.conf
upstream geode_websockets {
    ip_hash;  # Sticky sessions based on client IP

    server geode-1.internal:8443;
    server geode-2.internal:8443;
    server geode-3.internal:8443;
}

server {
    listen 443 ssl;
    server_name geode.example.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location /ws {
        proxy_pass https://geode_websockets;
        proxy_http_version 1.1;

        # WebSocket upgrade headers
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;

        # Timeouts for long-lived connections
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;

        # Disable buffering
        proxy_buffering off;
    }
}
```

### Connection Scaling

Handle thousands of concurrent WebSocket connections:

```javascript
// Server-side connection management
class WebSocketPool {
  constructor() {
    this.connections = new Map();
    this.maxConnections = 10000;
    this.connectionTimeout = 300000;  // 5 minutes
  }

  addConnection(userId, ws) {
    // Enforce connection limit
    if (this.connections.size >= this.maxConnections) {
      ws.close(1008, 'Server at capacity');
      return false;
    }

    // Close existing connection for same user
    const existing = this.connections.get(userId);
    if (existing) {
      existing.close(1000, 'Replaced by new connection');
    }

    this.connections.set(userId, ws);

    // Set idle timeout
    ws.lastActivity = Date.now();
    ws.timeout = setTimeout(() => {
      if (Date.now() - ws.lastActivity > this.connectionTimeout) {
        ws.close(1000, 'Idle timeout');
        this.connections.delete(userId);
      }
    }, this.connectionTimeout);

    ws.on('message', () => {
      ws.lastActivity = Date.now();
    });

    ws.on('close', () => {
      clearTimeout(ws.timeout);
      this.connections.delete(userId);
    });

    return true;
  }

  broadcast(message) {
    const data = JSON.stringify(message);
    for (const [userId, ws] of this.connections) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  sendToUser(userId, message) {
    const ws = this.connections.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  getStats() {
    return {
      total_connections: this.connections.size,
      capacity_used: (this.connections.size / this.maxConnections * 100).toFixed(1) + '%'
    };
  }
}
```

### Security Hardening

Implement WebSocket security best practices:

```javascript
// Authentication middleware
function authenticateWebSocket(req, ws) {
  const token = new URL(req.url, 'ws://localhost').searchParams.get('token');

  if (!token) {
    ws.close(1008, 'Authentication required');
    return false;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return true;
  } catch (error) {
    ws.close(1008, 'Invalid token');
    return false;
  }
}

// Rate limiting
const rateLimiter = new Map();

function checkRateLimit(userId) {
  const now = Date.now();
  const userLimit = rateLimiter.get(userId) || { count: 0, resetTime: now + 60000 };

  if (now > userLimit.resetTime) {
    // Reset counter
    rateLimiter.set(userId, { count: 1, resetTime: now + 60000 });
    return true;
  }

  if (userLimit.count >= 100) {  // 100 messages per minute
    return false;
  }

  userLimit.count++;
  return true;
}

// Message validation
function validateMessage(message) {
  const schema = {
    type: 'object',
    required: ['type', 'data'],
    properties: {
      type: { type: 'string', enum: ['QUERY', 'SUBSCRIBE', 'UNSUBSCRIBE'] },
      data: { type: 'object' }
    },
    maxProperties: 3
  };

  const validate = ajv.compile(schema);
  return validate(message);
}

// Apply security layers
wss.on('connection', (ws, req) => {
  if (!authenticateWebSocket(req, ws)) {
    return;
  }

  ws.on('message', (data) => {
    if (!checkRateLimit(req.user.id)) {
      ws.send(JSON.stringify({
        type: 'ERROR',
        error: 'Rate limit exceeded'
      }));
      return;
    }

    let message;
    try {
      message = JSON.parse(data);
    } catch (error) {
      ws.close(1003, 'Invalid JSON');
      return;
    }

    if (!validateMessage(message)) {
      ws.close(1003, 'Invalid message format');
      return;
    }

    handleMessage(req.user, message);
  });
});
```

## Monitoring and Observability

### Metrics Collection

Track WebSocket performance metrics:

```javascript
const metrics = {
  connections_total: 0,
  connections_active: 0,
  messages_sent: 0,
  messages_received: 0,
  bytes_sent: 0,
  bytes_received: 0,
  errors_total: 0,

  recordConnection() {
    this.connections_total++;
    this.connections_active++;
  },

  recordDisconnection() {
    this.connections_active--;
  },

  recordMessageSent(size) {
    this.messages_sent++;
    this.bytes_sent += size;
  },

  recordMessageReceived(size) {
    this.messages_received++;
    this.bytes_received += size;
  },

  recordError() {
    this.errors_total++;
  },

  getStats() {
    return {
      connections: {
        total: this.connections_total,
        active: this.connections_active
      },
      messages: {
        sent: this.messages_sent,
        received: this.messages_received
      },
      bandwidth: {
        sent_mb: (this.bytes_sent / 1024 / 1024).toFixed(2),
        received_mb: (this.bytes_received / 1024 / 1024).toFixed(2)
      },
      errors: this.errors_total
    };
  }
};

// Export to Prometheus
app.get('/metrics', (req, res) => {
  const stats = metrics.getStats();
  res.set('Content-Type', 'text/plain');
  res.send(`
# HELP websocket_connections_active Active WebSocket connections
# TYPE websocket_connections_active gauge
websocket_connections_active ${stats.connections.active}

# HELP websocket_messages_sent_total Total messages sent
# TYPE websocket_messages_sent_total counter
websocket_messages_sent_total ${stats.messages.sent}

# HELP websocket_errors_total Total WebSocket errors
# TYPE websocket_errors_total counter
websocket_errors_total ${stats.errors}
  `.trim());
});
```

## Performance Optimization

### Message Batching

Batch multiple updates for efficiency:

```javascript
class MessageBatcher {
  constructor(ws, flushInterval = 100) {
    this.ws = ws;
    this.queue = [];
    this.flushInterval = flushInterval;
    this.timer = null;
  }

  enqueue(message) {
    this.queue.push(message);

    if (!this.timer) {
      this.timer = setTimeout(() => {
        this.flush();
      }, this.flushInterval);
    }
  }

  flush() {
    if (this.queue.length === 0) {
      return;
    }

    const batch = {
      type: 'BATCH',
      messages: this.queue
    };

    this.ws.send(JSON.stringify(batch));
    this.queue = [];
    this.timer = null;
  }
}

// Usage
const batcher = new MessageBatcher(ws);

// Instead of sending individually
for (const update of updates) {
  batcher.enqueue({
    type: 'UPDATE',
    data: update
  });
}
// Batched message sent after 100ms
```

### Compression

Enable WebSocket compression (permessage-deflate):

```javascript
const WebSocket = require('ws');

const wss = new WebSocket.Server({
  port: 8443,
  perMessageDeflate: {
    zlibDeflateOptions: {
      chunkSize: 1024,
      memLevel: 7,
      level: 3
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    clientNoContextTakeover: true,
    serverNoContextTakeover: true,
    serverMaxWindowBits: 10,
    concurrencyLimit: 10,
    threshold: 1024  // Only compress messages > 1KB
  }
});
```

Compression typically reduces bandwidth by 60-80% for text data.

## Troubleshooting WebSocket Issues

**Connection Drops Frequently**: Check firewall timeout settings. Implement heartbeat/ping-pong to keep connection alive. Verify proxy timeouts are configured correctly.

**High Latency**: Enable compression for large messages. Reduce message size through batching. Check network congestion between client and server.

**Memory Leaks**: Ensure event listeners are properly removed on disconnect. Clear timeouts and intervals when connection closes. Monitor memory usage of WebSocket server process.

**Authentication Failures**: Verify token is passed correctly in connection URL or initial message. Check token expiration and renewal logic. Ensure CORS is configured for WebSocket endpoint.

## Related Topics

- **[Real-Time](/tags/real-time/)**: Real-time data processing
- **[Streaming](/tags/streaming/)**: Event streaming
- **[Pub/Sub](/tags/pubsub/)**: Publish-subscribe messaging
- **[Events](/tags/events/)**: Event-driven architecture
- **[Networking](/tags/networking/)**: Network architecture
- **[Security](/tags/security/)**: Security best practices
- **[Monitoring](/tags/monitoring/)**: Application monitoring
- **[Performance](/tags/performance/)**: Performance optimization

## Further Reading

- **[WebSocket API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)**: Browser WebSocket documentation
- **[Socket.IO](https://socket.io/)**: Popular WebSocket library with fallbacks
- **[WebSocket Protocol RFC 6455](https://tools.ietf.org/html/rfc6455)**: Official WebSocket specification
- **Geode WebSocket Guide**: `/docs/networking/websockets/`
- **Real-Time Subscriptions**: `/docs/features/subscriptions/`
- **Connection Management**: `/docs/operations/connection-management/`
