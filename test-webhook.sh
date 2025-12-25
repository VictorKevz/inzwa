#!/bin/bash

# Test script for postCallWebhook
# Simulates a conversation with multiple intents (3+ products)

WEBHOOK_URL="https://postcallwebhook-ctmigyxh3q-uc.a.run.app"

curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
  "type": "post_call_transcription",
  "data": {
    "conversation_id": "conv_multi_intent_'$(date +%s)'",
    "agent_id": "agent_3601kcyj2dvbfg081bw4yw2h7gdp",
    "transcript": [
      {
        "role": "agent",
        "message": "Hi there! How can I assist you with your shopping needs?"
      },
      {
        "role": "user",
        "message": "Hi, I am looking for basketball shoes"
      },
      {
        "role": "agent",
        "message": "Great! I have a couple of options for basketball shoes. First, there is the DunkMaster Elite 5 for 99 EUR. These are high-top shoes designed to protect your ankles and boost performance with superior ankle support and responsive foam cushioning. They come in Midnight Blue and are available in sizes 44 and 45. Another option is the CourtKing Low for 55 EUR. These are low-cut sneakers that offer great ankle mobility and high-traction grip, perfect for quick movements and agility on the court. They are available in Electric Red in sizes 40 and 41."
      },
      {
        "role": "user",
        "message": "I will take the CourtKing Low in size 41"
      },
      {
        "role": "agent",
        "message": "Excellent! The CourtKing Low in Electric Red, size 41 for 55 EUR. You can add it to your cart on the product page. Is there anything else you need?"
      },
      {
        "role": "user",
        "message": "Actually, can you tell me more about the DunkMaster Elite 5? What colors do you have?"
      },
      {
        "role": "agent",
        "message": "The DunkMaster Elite 5 comes in Midnight Blue and is available in sizes 44 and 45. They are priced at 99 EUR. Would you like to add these as well?"
      },
      {
        "role": "user",
        "message": "Hmm, I need size 42. Do you have that size?"
      },
      {
        "role": "agent",
        "message": "I am sorry, but the DunkMaster Elite 5 is only available in sizes 44 and 45. We do not have size 42 in stock."
      },
      {
        "role": "user",
        "message": "That is too bad, I really wanted size 42. What about the DunkMaster Elite 5 in a different color?"
      },
      {
        "role": "agent",
        "message": "Unfortunately, we only have the DunkMaster Elite 5 in Midnight Blue at the moment. We do not have other color options available."
      },
      {
        "role": "user",
        "message": "Okay, I will skip the DunkMaster then. Do you have any running shoes?"
      },
      {
        "role": "agent",
        "message": "Looking up running shoes for you."
      },
      {
        "role": "agent",
        "message": "I am sorry, but I do not seem to have running shoes in our current catalog. We specialize in basketball shoes. Would you be interested in exploring other basketball shoe options?"
      },
      {
        "role": "user",
        "message": "No thanks, I will just stick with the CourtKing Low I already selected. That is all for today!"
      },
      {
        "role": "agent",
        "message": "Perfect! Thank you for your purchase. If you need anything else in the future, feel free to ask!"
      }
    ],
    "metadata": {
      "merchantId": "merchant_001"
    }
  }
}'

echo ""
echo "✅ Test completed! This should create 3+ intents:"
echo "   1. CourtKing Low - accepted (buy)"
echo "   2. DunkMaster Elite 5 - rejected (variant_missing - size 42)"
echo "   3. Running shoes - rejected (product_not_found)"
echo ""
echo "Check the response above for intentIds."

