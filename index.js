const express = require('express');
const {Client, Intents, Message} = require('discord.js')
const { DisTube } = require('distube')
const { SoundCloudPlugin } = require('@distube/soundcloud')
const { SpotifyPlugin } = require('@distube/spotify')
const { YtDlpPlugin } = require("@distube/yt-dlp")
const fetch = require("node-fetch")
require("dotenv").config()



const myIntents = new Intents();
myIntents.add(Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES);

const client = new Client({
    intents: myIntents,
})



// Create a new DisTube
const distube = new DisTube(client, {
    searchSongs: 5,
    searchCooldown: 30,
    leaveOnEmpty: false,
    leaveOnFinish: false,
    leaveOnStop: false,
    plugins: [new YtDlpPlugin(), new SpotifyPlugin()],
    youtubeDL: false
})


function exists(key, obj) {
  return Object.keys(obj).includes(key)
}

client.on('ready', client => {
    console.log(`Logged in as ${client.user.tag}!`)
        client.user.setActivity("🥑🥑🥑🥑🥑🥑🥑🥑🥑🥑🥑🥑🥑🥑🥑🥑🥑🥑🥑🥑🥑🥑🥑", { type: "PLAYING" });
  
})
// client.on("debug", console.log)



function isMentionCommand(message) {
    return message.content.startsWith("<@"+client.user.id+">")
}

function getMentionBot() {
    return "<@"+client.user.id+">"
}






function isInBotVC(message) {
  const authorVC = message.member?.voice?.channelId
  const botVC = distube.voices.get(message).voiceState?.channelId
  return (authorVC != null && botVC != null) && (authorVC == botVC)
}

client.on('messageCreate', async message => {
    if (message.author.bot || !message.inGuild()) return
  if(isMentionCommand(message) && message.content.includes("https://twitter.com"))
  {
    let url = message.content.match(/(^|[^'"])(https?:\/\/twitter\.com\/(?:#!\/)?(\w+)\/status(?:es)?\/(\d+))/)[2];
    let additional = message.content.replace(url, "")
    let id = url.split("/status/")[1]
  try{
      let resp = await fetch(`https://cdn.syndication.twimg.com/tweet?id=${id}`)
    let data = await resp.json();
    if(data.video) {
      let variants = data.video.variants.filter(x => !x.type.includes("mpeg"))
      let sorted = variants.sort((a,b) => {
        let res1 = a.src.substring(a.src.indexOf("x", 26)+1, a.src.lastIndexOf("/"))
        let res2 = b.src.substring(b.src.indexOf("x", 26)+1, b.src.lastIndexOf("/"))
        return parseInt(res2)-parseInt(res1)
      })
      await message.channel.send(sorted[0].src+`\n[Posted by ${message.author}]\n[Original tweet: ${url}]`)
      await message.delete()
    }
  }catch(ex){
      console.log('Fail', ex);
  }
    
  }
  let args
  let command
    if (message.content.startsWith(process.env.prefix)) {
         args = message.content
        .slice(process.env.prefix.length)
        .trim()
        .split(/ +/g)
          
    }
    else if(isMentionCommand(message)) {
        args = message.content.slice(getMentionBot().length).trim().split(/ +/g)
    }
    else {
        return
    }
    command = args.shift() 

    if (["play", "p"].includes(command)) {
        const voiceChannel = message.member?.voice?.channel
        if (voiceChannel) {
            await distube.play(voiceChannel, args.join(' '), {
                message,
                textChannel: message.channel,
                member: message.member,
            })
        } else {
            message.channel.send(
                'You must join a voice channel first.',
            )
        }
    }

    if (['repeat', 'loop'].includes(command)) {
        if(!isInBotVC(message)) {
          message.channel.send("You aren't in the same voice channel as the bot!")
          return
        } 
        const mode = distube.setRepeatMode(message)
        message.channel.send(
            `Set repeat mode to \`${
                mode
                    ? mode === 2
                        ? 'All Queue'
                        : 'This Song'
                    : 'Off'
            }\``,
        )
    }

    if (command === 'stop') {
        if(!isInBotVC(message)) {
          message.channel.send("You aren't in the same voice channel as the bot!")
          return
        } 
        distube.stop(message)
        message.channel.send('Stopped the music!')
    }

    if (command === 'leave') {
        if(!isInBotVC(message)) {
          message.channel.send("You aren't in the same voice channel as the bot!")
          return
        } 
        distube.voices.get(message)?.leave()
        message.channel.send('Left the voice channel!')
    }

    if (command === 'resume') {
      if(!isInBotVC(message)) {
          message.channel.send("You aren't in the same voice channel as the bot!")
          return
        } 
      distube.resume(message)
    }

    if (command === 'pause') {
      if(!isInBotVC(message)) {
          message.channel.send("You aren't in the same voice channel as the bot!")
          return
        } 
      distube.pause(message)
    }

    if (command === 'skip') {
      if(!isInBotVC(message)) {
          message.channel.send("You aren't in the same voice channel as the bot!")
          return
        } 
      const q = distube.getQueue(message)
      q.autoplay = false
      console.log(q.songs.length)
      if(q)
      {
        if(q.songs.length > 1)
          distube.skip(message)
        else q.stop()
        message.channel.send("Skipped!")
      }
      else {
        message.channel.send("No queue available!")
      }
      
    }

    if (["q", "queue"].includes(command)) {
      if(!isInBotVC(message)) {
          message.channel.send("You aren't in the same voice channel as the bot!")
          return
        } 
        const queue = distube.getQueue(message)
        if (!queue) {
            message.channel.send('Nothing playing right now!')
        } else {
            message.channel.send(
                `Current queue:\n${queue.songs
                    .map(
                        (song, id) =>
                            `**${id ? id : 'Playing'}**. ${
                                song.name
                            } - \`${song.formattedDuration}\``,
                    )
                    .slice(0, 10)
                    .join('\n')}`,
            )
        }
    }

    if (
        exists(command, distube.filters)
    ) {
      if(!isInBotVC(message)) {
          message.channel.send("You aren't in the same voice channel as the bot!")
          return
        } 
        const filter = distube.setFilter(message, command)
        message.channel.send(
            `Current queue filter: ${filter.join(', ') || 'Off'}`,
        )
    }
})

// Queue status template
const status = queue =>
    `Volume: \`${queue.volume}%\` | Filter: \`${
        queue.filters.join(', ') || 'Off'
    }\` | Loop: \`${
        queue.repeatMode
            ? queue.repeatMode === 2
                ? 'All Queue'
                : 'This Song'
            : 'Off'
    }\` | Autoplay: \`${queue.autoplay ? 'On' : 'Off'}\``

// DisTube event listeners, more in the documentation page
distube
    .on('playSong', (queue, song) => {
      if(queue.repeatMode != 0) {
        queue.textChannel?.send(
            `Playing \`${song.name}\` - \`${
                song.formattedDuration
            }\`\nRequested by: ${song.user}\n${status(queue)}`,
        )
      }
    
    })
    .on('addSong', (queue, song) =>
        queue.textChannel?.send(
            `Added ${song.name} - \`${song.formattedDuration}\` to the queue by ${song.user}`,
        ),
    )
    .on('addList', (queue, playlist) =>
        queue.textChannel?.send(
            `Added \`${playlist.name}\` playlist (${
                playlist.songs.length
            } songs) to queue\n${status(queue)}`,
        ),
    )
    .on('error', (textChannel, e) => {
        console.error(e)
        textChannel.send(
            `An error encountered: ${e.message.slice(0, 2000)}`,
        )
    })
    .on('finish', queue => queue.textChannel?.send('Finish queue!'))
    .on('disconnect', queue =>
        queue.textChannel?.send('Left channel!'),
    )
    .on('empty', queue =>
        queue.textChannel?.send(
            'The voice channel is empty! Leaving the voice channel...',
        ),
    )
    // DisTubeOptions.searchSongs > 1
    .on('searchResult', (message, result) => {
        let i = 0
        message.channel.send(
            `**Choose an option from below**\n${result
                .map(
                    song =>
                        `**${++i}**. ${song.name} - \`${
                            song.formattedDuration
                        }\``,
                )
                .join(
                    '\n',
                )}\n*Enter anything else or wait 30 seconds to cancel*`,
        )
    })
    .on('searchCancel', message =>
        message.channel.send('Searching canceled'),
    )
    .on('searchInvalidAnswer', message =>
        message.channel.send('Invalid number of result.'),
    )
    .on('searchNoResult', message =>
        message.channel.send('No result found!'),
    )
    .on('searchDone', () => {})


client.login(process.env.TOKEN)

