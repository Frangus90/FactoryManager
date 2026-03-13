import React, { useState } from 'react';

// ---------------------------------------------------------------------------
// Collapsible section component
// ---------------------------------------------------------------------------

interface SectionProps {
  title: string;
  icon: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, icon, children, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-factorio-border rounded-lg overflow-hidden mb-3">
      <button
        type="button"
        className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-colors ${
          open ? 'bg-factorio-panel' : 'bg-factorio-dark hover:bg-factorio-panel/60'
        }`}
        onClick={() => setOpen(!open)}
      >
        <span className="text-lg w-6 text-center shrink-0">{icon}</span>
        <span className="font-semibold text-factorio-text flex-1">{title}</span>
        <span
          className={`text-factorio-muted text-sm transition-transform duration-200 ${
            open ? 'rotate-90' : ''
          }`}
        >
          &#9654;
        </span>
      </button>
      {open && (
        <div className="px-5 py-4 bg-factorio-darker/50 text-sm text-factorio-text leading-relaxed space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small reusable bits
// ---------------------------------------------------------------------------

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="shrink-0 w-6 h-6 rounded-full bg-factorio-orange text-factorio-darker text-xs font-bold flex items-center justify-center mt-0.5">
        {n}
      </span>
      <div>{children}</div>
    </div>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 items-start bg-factorio-orange/10 border border-factorio-orange/30 rounded-lg px-4 py-2.5 text-sm">
      <span className="shrink-0 text-factorio-orange font-bold">Tip:</span>
      <span>{children}</span>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 items-start bg-blue-900/20 border border-blue-700/30 rounded-lg px-4 py-2.5 text-sm">
      <span className="shrink-0 text-blue-400 font-bold">Note:</span>
      <span>{children}</span>
    </div>
  );
}

function Cmd({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-factorio-darker border border-factorio-border rounded px-1.5 py-0.5 text-factorio-orange text-xs font-mono">
      {children}
    </code>
  );
}

// ---------------------------------------------------------------------------
// Main Help page
// ---------------------------------------------------------------------------

export default function Help() {
  return (
    <div className="h-full overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-factorio-orange">Help &amp; Guide</h1>
        <p className="text-factorio-muted mt-1">
          Everything you need to know about running your Factorio server.
        </p>
      </div>

      {/* ================================================================= */}
      {/*  GETTING STARTED                                                   */}
      {/* ================================================================= */}
      <Section title="Getting Started — First Time Setup" icon="🚀" defaultOpen>
        <p>
          Before you can run a server, the app needs to know where Factorio is
          installed on your computer. Follow these steps:
        </p>

        <Step n={1}>
          <p>
            <strong>Open Settings</strong> — Click{' '}
            <span className="text-factorio-orange">Settings</span> at the bottom of the
            sidebar on the left.
          </p>
        </Step>

        <Step n={2}>
          <p>
            <strong>Find your Factorio folder</strong> — Click the{' '}
            <span className="text-factorio-orange">Auto-detect</span> button. The
            app will search common locations (Steam, standalone installer) for
            your Factorio installation. If it finds it, the path fills in
            automatically.
          </p>
          <p className="text-factorio-muted mt-1">
            If auto-detect doesn't work, click <strong>Browse</strong> and
            manually navigate to the folder where Factorio is installed. This is
            the folder that contains a <Cmd>bin</Cmd> folder inside it.
          </p>
          <p className="text-factorio-muted mt-1">
            <strong>Common locations:</strong>
          </p>
          <ul className="list-disc list-inside text-factorio-muted mt-1 space-y-0.5 ml-1">
            <li>
              Steam: <Cmd>C:\Program Files (x86)\Steam\steamapps\common\Factorio</Cmd>
            </li>
            <li>
              Standalone: <Cmd>C:\Program Files\Factorio</Cmd>
            </li>
          </ul>
        </Step>

        <Step n={3}>
          <p>
            <strong>Name your server profile</strong> — Give it any name you
            like, such as "My Server" or "Vanilla with Friends."
          </p>
        </Step>

        <Step n={4}>
          <p>
            <strong>Click "Create Profile"</strong> — That's it! You now have a
            server profile ready to go.
          </p>
        </Step>

        <Tip>
          You can leave the RCON port and password at their default values. The
          app handles this for you automatically.
        </Tip>
      </Section>

      {/* ================================================================= */}
      {/*  STARTING YOUR SERVER                                              */}
      {/* ================================================================= */}
      <Section title="Starting &amp; Stopping Your Server" icon="&#9654;">
        <p>
          Once you have a profile set up, you need a <strong>save file</strong>{' '}
          (your world) before you can start. If you don't have one yet, see the
          "Saves" section below.
        </p>

        <h4 className="font-semibold text-factorio-orange mt-4 mb-2">To start your server:</h4>

        <Step n={1}>
          <p>
            Go to <strong>Saves</strong> and either select an existing save or
            create a new one.
          </p>
        </Step>

        <Step n={2}>
          <p>
            Go to <strong>Dashboard</strong> and click the{' '}
            <span className="text-factorio-orange">Start</span> button.
          </p>
        </Step>

        <Step n={3}>
          <p>
            Wait a few seconds — you'll see the status change from{' '}
            <span className="text-yellow-400">Starting</span> to{' '}
            <span className="text-green-400">Running</span>. Once it says
            Running, your server is live and friends can join!
          </p>
        </Step>

        <h4 className="font-semibold text-factorio-orange mt-4 mb-2">To stop your server:</h4>
        <p>
          Click <span className="text-factorio-orange">Stop</span> on the
          Dashboard. The server will save the game and shut down gracefully. All
          connected players will be disconnected.
        </p>

        <h4 className="font-semibold text-factorio-orange mt-4 mb-2">How friends connect to your server:</h4>
        <p>
          Your friends need to open Factorio, go to <strong>Multiplayer</strong>{' '}
          &rarr; <strong>Connect to address</strong>, and type in your computer's
          IP address. The default port is <Cmd>34197</Cmd>.
        </p>
        <p className="text-factorio-muted mt-1">
          Example: if your IP is 192.168.1.50, they would type{' '}
          <Cmd>192.168.1.50:34197</Cmd>
        </p>

        <Note>
          If your friends are outside your local network (not on your WiFi),
          you'll need to set up port forwarding on your router for UDP port 34197.
          Search "port forwarding" + your router model for instructions.
        </Note>
      </Section>

      {/* ================================================================= */}
      {/*  DASHBOARD                                                         */}
      {/* ================================================================= */}
      <Section title="Dashboard" icon="&#8862;">
        <p>
          The Dashboard is your home screen. It shows you at a glance:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li>
            <strong>Server status</strong> — whether your server is stopped,
            starting, running, or stopping
          </li>
          <li>
            <strong>Start / Stop buttons</strong> — the main controls for your
            server
          </li>
          <li>
            <strong>Current save file</strong> — which world the server will
            load
          </li>
          <li>
            <strong>Recent log lines</strong> — the last few messages from the
            server so you can see what it's doing
          </li>
        </ul>
      </Section>

      {/* ================================================================= */}
      {/*  SAVES                                                             */}
      {/* ================================================================= */}
      <Section title="Saves — Managing Your Worlds" icon="&#128190;">
        <p>
          Every Factorio world is stored as a <strong>save file</strong> (a .zip
          file). You need at least one save file to run a server.
        </p>

        <h4 className="font-semibold text-factorio-orange mt-4 mb-2">Creating a new world:</h4>
        <Step n={1}>
          <p>Go to the <strong>Saves</strong> tab.</p>
        </Step>
        <Step n={2}>
          <p>
            Type a name for your new world in the "New Save" box (e.g. "World
            1").
          </p>
        </Step>
        <Step n={3}>
          <p>
            Click <strong>Create</strong>. Factorio will generate a brand new
            world. This may take a few seconds.
          </p>
        </Step>
        <Step n={4}>
          <p>
            Click <strong>Select</strong> next to the save you want the server to
            use.
          </p>
        </Step>

        <h4 className="font-semibold text-factorio-orange mt-4 mb-2">Use Latest Save:</h4>
        <p>
          If you turn this on, the server will automatically load whichever save
          was modified most recently. This is handy so you don't have to
          manually select a save every time.
        </p>

        <h4 className="font-semibold text-factorio-orange mt-4 mb-2">Where are save files stored?</h4>
        <p>
          Save files are <Cmd>.zip</Cmd> files inside the{' '}
          <Cmd>saves</Cmd> folder. The location depends on how Factorio was
          installed:
        </p>
        <ul className="list-disc list-inside text-factorio-muted mt-1 space-y-0.5 ml-1">
          <li>
            <strong>Steam / installer:</strong>{' '}
            <Cmd>C:\Users\YourName\AppData\Roaming\Factorio\saves\</Cmd>
          </li>
          <li>
            <strong>Portable / zip:</strong> inside the Factorio installation folder under <Cmd>saves\</Cmd>
          </li>
        </ul>
        <p className="mt-1">
          You can also copy save files into this folder manually and they'll
          show up in the app after you click Refresh.
        </p>

        <Tip>
          Deleting a save moves it to your Recycle Bin, so you can recover it
          if you change your mind.
        </Tip>
      </Section>

      {/* ================================================================= */}
      {/*  CONFIG                                                            */}
      {/* ================================================================= */}
      <Section title="Config — Server Settings" icon="&#9881;">
        <p>
          The Config page lets you change how your server behaves. Here's what
          each section means:
        </p>

        <h4 className="font-semibold text-factorio-orange mt-4 mb-2">General</h4>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li>
            <strong>Server Name</strong> — the name players see in the server
            browser
          </li>
          <li>
            <strong>Description</strong> — a short description of your server
          </li>
          <li>
            <strong>Tags</strong> — keywords like "vanilla", "modded", "chill"
            (comma-separated)
          </li>
        </ul>

        <h4 className="font-semibold text-factorio-orange mt-4 mb-2">Players</h4>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li>
            <strong>Max Players</strong> — how many people can play at once (0 =
            unlimited)
          </li>
          <li>
            <strong>Game Password</strong> — if set, players need this password
            to join
          </li>
          <li>
            <strong>Allow Commands</strong> — who can use console commands
            (Everyone, Nobody, or Admins Only)
          </li>
          <li>
            <strong>AFK Auto-kick</strong> — kick players who are idle for this
            many minutes (0 = never)
          </li>
        </ul>

        <h4 className="font-semibold text-factorio-orange mt-4 mb-2">Visibility</h4>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li>
            <strong>Public</strong> — your server shows up in the public server
            browser for anyone to find. Requires a Factorio account (see
            Authentication).
          </li>
          <li>
            <strong>LAN</strong> — your server shows up for people on the same
            local network (WiFi/Ethernet)
          </li>
        </ul>

        <h4 className="font-semibold text-factorio-orange mt-4 mb-2">Authentication</h4>
        <p>
          Only needed if you want your server to be <strong>public</strong>{' '}
          (visible in the server browser). Enter your factorio.com username and
          either your password or an auth token.
        </p>

        <h4 className="font-semibold text-factorio-orange mt-4 mb-2">Auto-save</h4>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li>
            <strong>Autosave Interval</strong> — how often the game saves
            automatically (in minutes)
          </li>
          <li>
            <strong>Autosave Slots</strong> — how many autosave files to keep
            before overwriting the oldest
          </li>
        </ul>

        <h4 className="font-semibold text-factorio-orange mt-4 mb-2">Game Pause</h4>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li>
            <strong>Auto-pause when no players</strong> — pauses the game when
            everyone disconnects (recommended)
          </li>
          <li>
            <strong>Only admins can pause</strong> — prevents regular players
            from pausing the game
          </li>
        </ul>

        <Note>
          After changing settings, click <strong>Save</strong>. Changes only take
          effect the <strong>next time you start</strong> the server — they
          don't apply while it's already running.
        </Note>
      </Section>

      {/* ================================================================= */}
      {/*  RCON CONSOLE                                                      */}
      {/* ================================================================= */}
      <Section title="RCON Console — Server Commands" icon="&gt;_">
        <p>
          The RCON Console lets you send commands directly to your running
          server. Think of it like a chat window where you talk to the server
          itself.
        </p>

        <Note>
          The console only works while the server is <strong>running</strong>.
          When you start a server through the Dashboard, the console connects
          automatically.
        </Note>

        <h4 className="font-semibold text-factorio-orange mt-4 mb-2">How to use it:</h4>
        <Step n={1}>
          <p>Start your server from the Dashboard.</p>
        </Step>
        <Step n={2}>
          <p>Go to the <strong>RCON Console</strong> tab.</p>
        </Step>
        <Step n={3}>
          <p>
            Type a command in the box at the bottom and press <strong>Enter</strong>.
          </p>
        </Step>

        <h4 className="font-semibold text-factorio-orange mt-4 mb-2">Useful commands:</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-factorio-border rounded">
            <thead>
              <tr className="bg-factorio-dark">
                <th className="text-left px-3 py-2 text-factorio-muted font-medium border-b border-factorio-border">Command</th>
                <th className="text-left px-3 py-2 text-factorio-muted font-medium border-b border-factorio-border">What it does</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factorio-border/50">
              <tr><td className="px-3 py-1.5"><Cmd>/players</Cmd></td><td className="px-3 py-1.5">Shows who is currently online</td></tr>
              <tr><td className="px-3 py-1.5"><Cmd>/save</Cmd></td><td className="px-3 py-1.5">Force-saves the game right now</td></tr>
              <tr><td className="px-3 py-1.5"><Cmd>/ban PlayerName reason</Cmd></td><td className="px-3 py-1.5">Bans a player (they can't rejoin)</td></tr>
              <tr><td className="px-3 py-1.5"><Cmd>/unban PlayerName</Cmd></td><td className="px-3 py-1.5">Removes a ban</td></tr>
              <tr><td className="px-3 py-1.5"><Cmd>/kick PlayerName reason</Cmd></td><td className="px-3 py-1.5">Kicks a player (they can rejoin)</td></tr>
              <tr><td className="px-3 py-1.5"><Cmd>/promote PlayerName</Cmd></td><td className="px-3 py-1.5">Makes a player an admin</td></tr>
              <tr><td className="px-3 py-1.5"><Cmd>/demote PlayerName</Cmd></td><td className="px-3 py-1.5">Removes admin from a player</td></tr>
              <tr><td className="px-3 py-1.5"><Cmd>/admins</Cmd></td><td className="px-3 py-1.5">Lists all admins</td></tr>
              <tr><td className="px-3 py-1.5"><Cmd>/whitelist add PlayerName</Cmd></td><td className="px-3 py-1.5">Adds someone to the whitelist</td></tr>
              <tr><td className="px-3 py-1.5"><Cmd>/whitelist remove PlayerName</Cmd></td><td className="px-3 py-1.5">Removes someone from the whitelist</td></tr>
              <tr><td className="px-3 py-1.5"><Cmd>/version</Cmd></td><td className="px-3 py-1.5">Shows the Factorio version</td></tr>
              <tr><td className="px-3 py-1.5"><Cmd>/time</Cmd></td><td className="px-3 py-1.5">Shows how old the map is</td></tr>
              <tr><td className="px-3 py-1.5"><Cmd>/evolution</Cmd></td><td className="px-3 py-1.5">Shows biter evolution percentage</td></tr>
              <tr><td className="px-3 py-1.5"><Cmd>/seed</Cmd></td><td className="px-3 py-1.5">Shows the map seed</td></tr>
            </tbody>
          </table>
        </div>

        <Tip>
          Press the <strong>Up</strong> and <strong>Down</strong> arrow keys to
          scroll through commands you've typed before.
        </Tip>
      </Section>

      {/* ================================================================= */}
      {/*  LOGS                                                              */}
      {/* ================================================================= */}
      <Section title="Logs — Server Output" icon="&#128203;">
        <p>
          The Logs page shows you everything the server is printing out in
          real-time — like a live feed of what's happening behind the scenes.
        </p>
        <p>You'll see messages like:</p>
        <ul className="list-disc list-inside space-y-1 ml-1">
          <li>When the server finishes loading the map</li>
          <li>When players join or leave</li>
          <li>When autosaves happen</li>
          <li>Any errors or warnings</li>
        </ul>
        <p className="mt-2">
          Error messages show up in <span className="text-red-400">red</span> so
          they're easy to spot.
        </p>

        <Tip>
          If something isn't working, check the Logs first — the answer is
          usually there.
        </Tip>
      </Section>

      {/* ================================================================= */}
      {/*  MODS                                                              */}
      {/* ================================================================= */}
      <Section title="Mods — Adding &amp; Managing Mods" icon="&#129513;">
        <p>
          You can run your server with mods! All players who join will need to
          have the same mods installed.
        </p>

        <h4 className="font-semibold text-factorio-orange mt-4 mb-2">How to add mods to your server:</h4>
        <Step n={1}>
          <p>
            Download the mod you want as a <Cmd>.zip</Cmd> file. You can find
            mods at{' '}
            <span className="text-factorio-orange">mods.factorio.com</span>.
          </p>
        </Step>
        <Step n={2}>
          <p>
            Copy the .zip file into the <Cmd>mods</Cmd> folder. The location
            depends on how Factorio was installed:
          </p>
          <ul className="list-disc list-inside text-factorio-muted mt-1 space-y-0.5 ml-1">
            <li>
              <strong>Steam / installer:</strong>{' '}
              <Cmd>C:\Users\YourName\AppData\Roaming\Factorio\mods\</Cmd>
            </li>
            <li>
              <strong>Portable / zip:</strong> inside the Factorio installation folder under <Cmd>mods\</Cmd>
            </li>
          </ul>
          <Tip>
            The easiest way to find this folder: open Factorio, go to the main menu,
            click <strong>Mods</strong>, then <strong>Open Mods Folder</strong>.
          </Tip>
        </Step>
        <Step n={3}>
          <p>
            Open the <strong>Mods</strong> tab in this app and click{' '}
            <strong>Refresh</strong>. Your new mod should appear in the list.
          </p>
        </Step>
        <Step n={4}>
          <p>
            Make sure the toggle switch next to the mod is turned{' '}
            <span className="text-green-400">on</span> (orange).
          </p>
        </Step>
        <Step n={5}>
          <p>
            <strong>Restart your server</strong> for the mod to take effect. Mod
            changes are <em>not</em> applied while the server is running.
          </p>
        </Step>

        <h4 className="font-semibold text-factorio-orange mt-4 mb-2">Disabling a mod:</h4>
        <p>
          Click the toggle switch next to a mod to turn it off. The mod file
          stays on your computer, it just won't be loaded when the server starts.
        </p>

        <Note>
          The "base" mod is Factorio itself and cannot be disabled.
        </Note>

        <Note>
          All players connecting to your server must have the exact same mods
          and mod versions installed, or they won't be able to join.
        </Note>
      </Section>

      {/* ================================================================= */}
      {/*  PLAYERS                                                           */}
      {/* ================================================================= */}
      <Section title="Players — Managing Who Can Join" icon="&#128101;">
        <p>
          The Players page lets you control who can join your server and what
          privileges they have. It has three tabs:
        </p>

        <h4 className="font-semibold text-factorio-orange mt-4 mb-2">Admins</h4>
        <p>
          Admins are players with special privileges — they can use console
          commands, kick other players, and pause the game (depending on your
          settings). Add someone's Factorio username to make them an admin.
        </p>

        <h4 className="font-semibold text-factorio-orange mt-4 mb-2">Bans</h4>
        <p>
          Banned players cannot join your server at all. You can add a reason
          so you remember why you banned them. Use the Unban button to let
          someone back in.
        </p>

        <h4 className="font-semibold text-factorio-orange mt-4 mb-2">Whitelist</h4>
        <p>
          If you want to run a private server where only specific people can
          join, add their usernames to the whitelist. Anyone not on the list
          will be blocked from connecting.
        </p>

        <h4 className="font-semibold text-factorio-orange mt-4 mb-2">Active Players</h4>
        <p>
          When the server is running, you'll see a section at the bottom showing
          who is currently online. You can kick players from here if needed.
        </p>

        <Tip>
          If the server is running, changes are applied immediately — the player
          gets banned/kicked/promoted right away. If the server is stopped,
          changes are saved to the config files and will apply next time you
          start.
        </Tip>
      </Section>

      {/* ================================================================= */}
      {/*  SETTINGS                                                          */}
      {/* ================================================================= */}
      <Section title="Settings — App Configuration" icon="&#9881;">
        <p>
          The Settings page is where you manage your <strong>server
          profile</strong> — the basic configuration that tells the app where
          Factorio is and how to connect to the server.
        </p>

        <ul className="list-disc list-inside space-y-1.5 ml-1 mt-2">
          <li>
            <strong>Profile Name</strong> — just a label for your reference
          </li>
          <li>
            <strong>Factorio Path</strong> — the folder where Factorio is
            installed
          </li>
          <li>
            <strong>Server Port</strong> — the port players connect to (default:
            34197). Only change this if you need to run multiple servers.
          </li>
          <li>
            <strong>RCON Port &amp; Password</strong> — used internally for the
            app to communicate with the server. You generally don't need to
            change these.
          </li>
        </ul>
      </Section>

      {/* ================================================================= */}
      {/*  WHERE ARE MY FILES                                                */}
      {/* ================================================================= */}
      <Section title="Where Are My Files?" icon="&#128193;">
        <p>
          Factorio stores files in <strong>two different places</strong>
          depending on how you installed it:
        </p>

        <h4 className="font-semibold text-factorio-orange mt-4 mb-2">
          Steam / Installer Version (most common)
        </h4>
        <p>
          Your game data — saves, mods, and configuration — lives in your
          Windows AppData folder:
        </p>
        <p className="mt-1">
          <Cmd>C:\Users\YourName\AppData\Roaming\Factorio\</Cmd>
        </p>
        <Note>
          To open this folder quickly: press <Cmd>Win + R</Cmd>, type{' '}
          <Cmd>%APPDATA%\Factorio</Cmd>, and press Enter.
        </Note>

        <h4 className="font-semibold text-factorio-orange mt-4 mb-2">
          Portable / Zip Version
        </h4>
        <p>
          Everything is inside the folder where you extracted Factorio.
        </p>

        <h4 className="font-semibold text-factorio-orange mt-4 mb-2">
          File Locations
        </h4>

        <div className="overflow-x-auto mt-2">
          <table className="w-full text-sm border border-factorio-border rounded">
            <thead>
              <tr className="bg-factorio-dark">
                <th className="text-left px-3 py-2 text-factorio-muted font-medium border-b border-factorio-border">What</th>
                <th className="text-left px-3 py-2 text-factorio-muted font-medium border-b border-factorio-border">Steam / Installer</th>
                <th className="text-left px-3 py-2 text-factorio-muted font-medium border-b border-factorio-border">Portable / Zip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-factorio-border/50">
              <tr>
                <td className="px-3 py-2">Save files</td>
                <td className="px-3 py-2"><Cmd>%APPDATA%\Factorio\saves\</Cmd></td>
                <td className="px-3 py-2"><Cmd>Factorio\saves\</Cmd></td>
              </tr>
              <tr>
                <td className="px-3 py-2">Mods</td>
                <td className="px-3 py-2"><Cmd>%APPDATA%\Factorio\mods\</Cmd></td>
                <td className="px-3 py-2"><Cmd>Factorio\mods\</Cmd></td>
              </tr>
              <tr>
                <td className="px-3 py-2">Mod list</td>
                <td className="px-3 py-2"><Cmd>%APPDATA%\Factorio\mods\mod-list.json</Cmd></td>
                <td className="px-3 py-2"><Cmd>Factorio\mods\mod-list.json</Cmd></td>
              </tr>
              <tr>
                <td className="px-3 py-2">Server settings</td>
                <td className="px-3 py-2"><Cmd>Install\data\server-settings.json</Cmd></td>
                <td className="px-3 py-2"><Cmd>Factorio\data\server-settings.json</Cmd></td>
              </tr>
              <tr>
                <td className="px-3 py-2">Admin list</td>
                <td className="px-3 py-2"><Cmd>%APPDATA%\Factorio\server-adminlist.json</Cmd></td>
                <td className="px-3 py-2"><Cmd>Factorio\server-adminlist.json</Cmd></td>
              </tr>
              <tr>
                <td className="px-3 py-2">Ban list</td>
                <td className="px-3 py-2"><Cmd>%APPDATA%\Factorio\server-banlist.json</Cmd></td>
                <td className="px-3 py-2"><Cmd>Factorio\server-banlist.json</Cmd></td>
              </tr>
              <tr>
                <td className="px-3 py-2">Whitelist</td>
                <td className="px-3 py-2"><Cmd>%APPDATA%\Factorio\server-whitelist.json</Cmd></td>
                <td className="px-3 py-2"><Cmd>Factorio\server-whitelist.json</Cmd></td>
              </tr>
              <tr>
                <td className="px-3 py-2">Server executable</td>
                <td className="px-3 py-2" colSpan={2}><Cmd>Install\bin\x64\factorio.exe</Cmd> (always in the installation folder)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <Tip>
          The app automatically detects which type of install you have and looks
          in the correct folder. You don't need to configure anything — just make
          sure files are in the right place.
        </Tip>
      </Section>

      {/* ================================================================= */}
      {/*  TROUBLESHOOTING                                                   */}
      {/* ================================================================= */}
      <Section title="Troubleshooting &amp; FAQ" icon="&#10067;">
        <h4 className="font-semibold text-factorio-orange mb-2">
          "The server won't start"
        </h4>
        <ul className="list-disc list-inside space-y-1 ml-1 mb-4">
          <li>
            Make sure you have a save file selected (check the Saves tab)
          </li>
          <li>
            Check that your Factorio path is correct in Settings
          </li>
          <li>
            Look at the <strong>Logs</strong> tab for error messages
          </li>
          <li>
            Make sure Factorio isn't already running (close the game first)
          </li>
        </ul>

        <h4 className="font-semibold text-factorio-orange mb-2">
          "My friends can't connect"
        </h4>
        <ul className="list-disc list-inside space-y-1 ml-1 mb-4">
          <li>
            Make sure the server is actually running (Dashboard should say
            "Running")
          </li>
          <li>
            If they're on the same WiFi, they should use your{' '}
            <strong>local IP address</strong> (usually 192.168.x.x)
          </li>
          <li>
            If they're connecting over the internet, you need to{' '}
            <strong>forward port 34197 (UDP)</strong> on your router
          </li>
          <li>
            Check that your Windows Firewall isn't blocking Factorio — you
            should see a prompt the first time you start the server
          </li>
          <li>
            Make sure they have the same Factorio version and the same mods
            installed
          </li>
        </ul>

        <h4 className="font-semibold text-factorio-orange mb-2">
          "The RCON Console says Disconnected"
        </h4>
        <ul className="list-disc list-inside space-y-1 ml-1 mb-4">
          <li>
            The console only works when the server is running. Start the server
            first.
          </li>
          <li>
            It connects automatically — if it doesn't, wait a few seconds after
            the server starts, then try clicking Connect manually.
          </li>
        </ul>

        <h4 className="font-semibold text-factorio-orange mb-2">
          "Mods aren't working"
        </h4>
        <ul className="list-disc list-inside space-y-1 ml-1 mb-4">
          <li>
            Did you restart the server after enabling the mod? Changes only
            apply on restart.
          </li>
          <li>
            Make sure the mod .zip file is in the correct <Cmd>mods</Cmd> folder
            (see "Where Are My Files?" above — for Steam installs this is in
            AppData, <em>not</em> the game installation folder)
          </li>
          <li>
            Check that the mod is compatible with your Factorio version
          </li>
        </ul>

        <h4 className="font-semibold text-factorio-orange mb-2">
          "What happens if I close this app while the server is running?"
        </h4>
        <p className="mb-4">
          The server will be stopped automatically when you close the app. It
          will try to save the game and shut down gracefully before closing.
        </p>

        <h4 className="font-semibold text-factorio-orange mb-2">
          "Can I run the server and play Factorio at the same time?"
        </h4>
        <p>
          Yes! The server runs separately from the game. Start the server with
          this app, then open Factorio normally and connect to your own server
          via Multiplayer &rarr; Connect to address &rarr;{' '}
          <Cmd>localhost</Cmd>.
        </p>
      </Section>

      {/* Footer spacer */}
      <div className="h-8" />
    </div>
  );
}
