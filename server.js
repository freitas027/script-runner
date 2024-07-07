const express = require('express');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(express.json());

app.get('/api/scripts', async (req, res) => {
  try {
    const optionsDir = path.join(__dirname, 'options');
    const files = await fsp.readdir(optionsDir);
    const jsonFiles = files.filter(file => path.extname(file) === '.json');
    const scripts = await Promise.all(jsonFiles.map(async file => {
      const content = await fsp.readFile(path.join(optionsDir, file), 'utf-8');
      const scriptConfig = JSON.parse(content);
      return {
        name: scriptConfig.name,
        description: scriptConfig.description,
        scriptPath: scriptConfig.scriptPath,
        arguments: scriptConfig.arguments
      };
    }));
    res.json(scripts);
  } catch (error) {
    console.error('Error loading scripts:', error);
    res.status(500).json({ error: 'Failed to load scripts' });
  }
});

app.post('/api/run-script', async (req, res) => {
  try {
    const { scriptPath, args } = req.body;
    console.log('Received request to run script:', scriptPath);
    console.log('Arguments:', args);

    const fullScriptPath = path.join(__dirname, scriptPath);
    console.log('Full script path:', fullScriptPath);

    if (!fs.existsSync(fullScriptPath)) {
      console.error('Script file does not exist:', fullScriptPath);
      return res.status(404).json({ error: 'Script file not found' });
    }

    const scriptProcess = spawn('node', [fullScriptPath, ...args]);

    let output = '';
    let errorOutput = '';

    scriptProcess.stdout.on('data', (data) => {
      output += data.toString();
      console.log('Script output:', data.toString());
    });

    scriptProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error('Script error:', data.toString());
    });

    scriptProcess.on('close', (code) => {
      console.log('Script process closed with code:', code);
      if (code === 0) {
        res.json({ success: true, output });
      } else {
        res.status(500).json({ error: 'Script execution failed', output: errorOutput });
      }
    });
  } catch (error) {
    console.error('Error running script:', error);
    res.status(500).json({ error: 'Failed to run script', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});