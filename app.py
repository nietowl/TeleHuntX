import asyncio
import json
from flask import Flask, render_template, request, jsonify
from telethon import TelegramClient, types 
from telethon.tl.functions.messages import SearchRequest
from telethon.tl.types import InputMessagesFilterEmpty
import os
import logging
import json

app = Flask(__name__)

# Function to read API credentials from a JSON file
def read_credentials_from_file(file_path):
    with open(file_path, 'r') as file:
        credentials = json.load(file)
    return credentials

# Context manager for the TelegramClient
class TelegramClientContext:
    def __init__(self, api_id, api_hash):
        self.api_id = api_id
        self.api_hash = api_hash
        self.client = None

    async def __aenter__(self):
        self.client = TelegramClient('session_name', self.api_id, self.api_hash)
        print("Starting Telegram client...")
        await self.client.start()
        print("Telegram client started.")
        return self.client

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.client:
            print("Closing Telegram client...")
            await self.client.disconnect()
            print("Telegram client closed.")

# Function to perform the search
async def perform_search(client, search_query, limit=5):
    search_results = []
    try:
        # Perform the search using the 'iter_messages' method with 'entity=None' to search on the entire Telegram
        async for message in client.iter_messages(entity=None, search=search_query, limit=limit):
            try:
                # Get the sender's entity (channel, group, or person)
                sender_entity = await client.get_entity(message.sender_id)

                # Determine the type of sender (group, channel, or person)
                sender_type = 'Unknown'
                if isinstance(sender_entity, types.User):
                    sender_type = 'Person'
                elif isinstance(sender_entity, types.Channel):
                    sender_type = 'Channel'
                elif isinstance(sender_entity, types.Chat):
                    sender_type = 'Group'

                # Check if the message contains URLs and include them in the result
                urls = []
                if message.entities:
                    for entity in message.entities:
                        if isinstance(entity, types.MessageEntityUrl):
                            # For 'MessageEntityUrl', we need to extract URLs differently
                            url_start = entity.offset
                            url_end = entity.offset + entity.length
                            url = message.text[url_start:url_end]
                            urls.append(url)

                # Check if there is any file attached to the message
                attached_files = []
                if message.media:
                    if isinstance(message.media, types.MessageMediaPhoto):
                        media_info = {
                            'type': 'Photo',
                            'file': 'Unknown',
                            'mime_type': 'image/jpeg',  # Assuming it's an image
                            'size': 0  # Size not available for photos
                        }
                        attached_files.append(media_info)

                # Check if the content is valid JSON and beautify it
                try:
                    content_json = json.loads(message.message)
                    content_beautified = json.dumps(content_json, indent=4, sort_keys=True)
                except json.JSONDecodeError:
                    content_beautified = None

                # Include the entire message text
                content = message.text

                # Build the URL of the post
                if message.chat.username:
                    post_url = f'https://t.me/{message.chat.username}/{message.id}'
                else:
                    post_url = f'https://t.me/c/{str(message.chat.id)[4:]}/{message.id}'

                # Append the search result as a dictionary to the search_results list
                search_results.append({
                    'message_id': message.id,
                    'date': str(message.date),
                    'sender': sender_entity.title if hasattr(sender_entity, 'title') else 'Unknown',
                    'sender_type': sender_type,
                    'content': content,
                    'content_beautified': content_beautified,
                    'in_message_urls': urls,
                    'attached_files': attached_files,
                    'post_url': post_url,
                })

            except Exception as sender_error:
                print(f"Error while getting sender information: {str(sender_error)}")

    except Exception as e:
        print(f"Error: {str(e)}")

    return search_results


# Route for the home page
@app.route('/')
def home():
    return render_template('index.html')

# Route for the search functionality
@app.route('/search', methods=['POST'])
async def search():
    if request.method == 'POST':
        try:
            # Get the JSON data from the request body
            request_data = request.json
            search_query = request_data.get('q')

            if not search_query:
                return jsonify({'error': 'Search query not provided'})

            # Get the Telegram API credentials from a JSON file
            api_credentials_file = '/home/cipher/own_projects/lead_gen/telegram_hunter/credentials.json'
            if not os.path.exists(api_credentials_file):
                raise FileNotFoundError(f"API credentials file '{api_credentials_file}' not found.")

            api_credentials = read_credentials_from_file(api_credentials_file)

            # Start the TelegramClient using the context manager
            async with TelegramClientContext(api_credentials['api_id'], api_credentials['api_hash']) as client:
                # Perform the search and get the results
                search_results = await perform_search(client, search_query)

            # Print the search results for debugging purposes
            print(search_results)

            # Return the search results as a JSON response
            return jsonify(search_results)

        except Exception as e:
            return jsonify({'error': str(e)})


if __name__ == '__main__':
    # Run the Flask application
    app.run(debug=True)