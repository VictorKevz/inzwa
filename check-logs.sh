#!/bin/bash

# Helper script to check Cloud Functions logs using gcloud
# Run this in Cloud Shell or locally if you have gcloud CLI installed

PROJECT_ID="inzwa-hackathon"
FUNCTION_NAME="postCallWebhook"

echo "📋 Checking logs for $FUNCTION_NAME..."
echo ""
echo "Option 1: Recent error logs (recommended):"
echo "gcloud logging read \"resource.type=cloud_run_revision AND resource.labels.service_name=$FUNCTION_NAME AND severity>=ERROR\" --limit 20 --project $PROJECT_ID --format=\"table(timestamp, textPayload, jsonPayload.message)\""
echo ""
echo "Option 2: All recent logs:"
echo "gcloud logging read \"resource.type=cloud_run_revision AND resource.labels.service_name=$FUNCTION_NAME\" --limit 20 --project $PROJECT_ID --format=\"table(timestamp, severity, textPayload)\""
echo ""
echo "Option 3: Search for analyzeCall errors:"
echo "gcloud logging read \"resource.type=cloud_run_revision AND resource.labels.service_name=$FUNCTION_NAME AND textPayload=~'analyzeCall'\" --limit 20 --project $PROJECT_ID"
echo ""
echo "💡 To run in Cloud Shell:"
echo "1. Go to: https://shell.cloud.google.com/"
echo "2. Copy and paste one of the commands above"
echo ""
echo "Or check Firebase Console:"
echo "https://console.firebase.google.com/project/$PROJECT_ID/functions/logs"

