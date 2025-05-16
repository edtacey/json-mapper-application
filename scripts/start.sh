#!/bin/bash

echo "Starting JsonMapper..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi

# Check if frontend node_modules exists
if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

# Initialize example data if needed
if [ ! -d "data/entities" ]; then
    echo "Initializing example data..."
    npm run init:examples
fi

# Start both frontend and backend
echo "Starting servers..."
npm run dev &
cd frontend && npm run dev &

wait
