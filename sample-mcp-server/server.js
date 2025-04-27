const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const morgan = require('morgan');
const { EventEmitter } = require('events');

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Event emitter for MCP Server-Sent Events
const eventEmitter = new EventEmitter();

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Configure multer for file uploads
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// MCP endpoint definitions
app.post('/api/v1/analyze', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text input is required' });
    }
    
    // Sample processing logic
    const result = {
      sentiment: analyzeSentiment(text),
      wordCount: countWords(text),
      processedTimestamp: new Date().toISOString()
    };
    
    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Error processing text:', error);
    res.status(500).json({ error: 'Failed to process text' });
  }
});

app.post('/api/v1/process-image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }
    
    const filePath = req.file.path;
    
    // Sample image processing logic
    const result = {
      fileName: req.file.filename,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      dimensions: { width: 800, height: 600 }, // Simulated dimensions
      colors: ['#FF5733', '#33FF57', '#3357FF'], // Simulated color extraction
      processedTimestamp: new Date().toISOString()
    };
    
    res.json({
      status: 'success',
      data: result
    });
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ error: 'Failed to process image' });
  }
});

app.post('/api/v1/translate', async (req, res) => {
  try {
    const { text, targetLanguage } = req.body;
    
    if (!text || !targetLanguage) {
      return res.status(400).json({ error: 'Text and target language are required' });
    }
    
    // Sample translation logic
    const translatedText = mockTranslate(text, targetLanguage);
    
    res.json({
      status: 'success',
      data: {
        originalText: text,
        translatedText: translatedText,
        targetLanguage: targetLanguage,
        processedTimestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error translating text:', error);
    res.status(500).json({ error: 'Failed to translate text' });
  }
});

app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'online',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// MCP Protocol Endpoints for VS Code Integration
// Root endpoint for MCP protocol
app.get('/', (req, res) => {
  console.log("SSE connection established");
  
  // Set headers for Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Accel-Buffering', 'no');
  
  // Function to keep connection alive
  const keepAlive = setInterval(() => {
    // Send a comment as a heartbeat
    res.write(': heartbeat\n\n');
  }, 30000); // Send a heartbeat every 30 seconds
  
  // Send initial message
  res.write('event: ready\ndata: {}\n\n');
  
  // Listen for events
  const listener = (event, data) => {
    console.log(`Sending SSE event: ${event}`);
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };
  
  eventEmitter.on('mcp-event', listener);
  
  // Send tools notification in JSON-RPC notification format
  const toolsNotification = {
    jsonrpc: "2.0",
    method: "mcpTool/register",
    params: {
      tools: [
        {
          id: "text-sentiment-analyzer",
          name: "Text Sentiment Analyzer",
          description: "Analyzes the sentiment of text input",
          actionName: "Analyze sentiment",
          inputTypes: ["text"],
          outputTypes: ["json"],
          options: {
            schema: {
              type: "object",
              properties: {}
            }
          }
        },
        {
          id: "text-translator",
          name: "Text Translator",
          description: "Translates text to different languages",
          actionName: "Translate text",
          inputTypes: ["text"],
          outputTypes: ["text"],
          options: {
            schema: {
              type: "object",
              properties: {
                targetLanguage: {
                  type: "string",
                  enum: ["es", "fr", "de"],
                  description: "Target language code"
                }
              },
              required: ["targetLanguage"]
            }
          }
        },
        {
          id: "image-analyzer",
          name: "Image Analyzer",
          description: "Analyzes and extracts information from images",
          actionName: "Analyze image", 
          inputTypes: ["image", "file"],
          outputTypes: ["json"],
          options: {
            schema: {
              type: "object",
              properties: {}
            }
          }
        }
      ]
    }
  };
  
  // We don't need to send tools notification via SSE anymore
  // Tools are registered via the initialize response
  
  // Clean up when the connection is closed
  req.on('close', () => {
    console.log("SSE connection closed");
    clearInterval(keepAlive);
    eventEmitter.removeListener('mcp-event', listener);
  });
});

// MCP initialize endpoint - JSON-RPC format
app.post('/', (req, res) => {
  console.log('MCP initialize request received');
  console.log('Request body:', req.body);
  
  // Handle JSON-RPC requests
  if (req.body.jsonrpc === '2.0') {
    const id = req.body.id;
    const method = req.body.method;
    console.log('Received method:', method);
    console.log('Request params:', req.body.params);
    
    if (method === 'initialize') {
      const tools = [
        {
          id: "echo-tool",
          name: "echo-tool",
          description: "Echoes the input text",
          actionName: "Echo",
          inputTypes: ["text"],
          outputTypes: ["text"],
          options: { 
            schema: { 
              type: "object", 
              properties: {} 
            } 
          }
        }
      ];

      return res.json({
        jsonrpc: '2.0',
        id: id,
        result: {
          serverInfo: {
            name: "Sample MCP Server",
            version: "1.0.0"
          },
          protocolVersion: "2025-03-26",
          capabilities: {
            textDocument: {
              analyze: true,
              translate: true,
              process: true
            },
            binaryData: {
              process: true
            },
            customCapabilities: {
              textAnalysis: true,
              imageProcessing: true,
              translation: true
            },
            tools,      // Tools inside capabilities
            mcpTools: tools // mcpTools inside capabilities
          },
          tools,      // Tools in root
          mcpTools: tools // mcpTools in root
        }
      });
    } else if (method === 'shutdown') {
      // Handle shutdown request
      return res.json({
        jsonrpc: '2.0',
        id: id,
        result: null
      });
    } else if (method === 'exit') {
      // Handle exit notification (no response needed)
      process.exit(0);
    } else if (method === 'notifications/initialized') {
      // This is a notification, no response needed
      return res.status(204).send();
    } else if (method === 'tools/list') {
      // Return the same tools list as in initialize
      const tools = [
        {
          id: "echo-tool",
          name: "echo-tool",
          description: "Echoes the input text",
          actionName: "Echo",
          inputTypes: ["text"],
          outputTypes: ["text"],
          options: { 
            schema: { 
              type: "object", 
              properties: {} 
            } 
          }
        }
      ];
      return res.json({
        jsonrpc: '2.0',
        id: id,
        result: {
          tools,      // Tools in root
          mcpTools: tools // mcpTools in root for new protocol
        }
      });
    } else if (method === 'mcpTool/execute') {
      const toolId = req.body.params?.toolId;
      const input = req.body.params?.input;
      const options = req.body.params?.options;

      if (toolId === 'echo-tool') {
        return res.json({
          jsonrpc: '2.0',
          id: id,
          result: {
            output: input
          }
        });
      }
    }
  }

  res.status(400).json({
    jsonrpc: '2.0',
    id: req.body.id,
    error: {
      code: -32601,
      message: 'Method not found'
    }
  });
});

// Helper functions for sample methods
function analyzeSentiment(text) {
  // This is a mock sentiment analysis function
  const words = text.toLowerCase().split(' ');
  const positiveWords = ['good', 'great', 'excellent', 'happy', 'love', 'like'];
  const negativeWords = ['bad', 'terrible', 'sad', 'hate', 'dislike'];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  words.forEach(word => {
    if (positiveWords.includes(word)) positiveCount++;
    if (negativeWords.includes(word)) negativeCount++;
  });
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

function countWords(text) {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

function mockTranslate(text, targetLanguage) {
  // This is just a mock translation function
  const translations = {
    'es': {
      'hello': 'hola',
      'world': 'mundo',
      'how are you': 'cómo estás',
      'goodbye': 'adiós'
    },
    'fr': {
      'hello': 'bonjour',
      'world': 'monde',
      'how are you': 'comment allez-vous',
      'goodbye': 'au revoir'
    },
    'de': {
      'hello': 'hallo',
      'world': 'welt',
      'how are you': 'wie geht es dir',
      'goodbye': 'auf wiedersehen'
    }
  };
  
  if (!translations[targetLanguage]) {
    return `[Translation to ${targetLanguage} not supported]`;
  }
  
  // Check if the exact phrase is in our dictionary
  if (translations[targetLanguage][text.toLowerCase()]) {
    return translations[targetLanguage][text.toLowerCase()];
  }
  
  // Otherwise return a placeholder
  return `[${text} in ${targetLanguage}]`;
}

// Start the server
app.listen(port, () => {
  console.log(`MCP Server running on port ${port}`);
});
