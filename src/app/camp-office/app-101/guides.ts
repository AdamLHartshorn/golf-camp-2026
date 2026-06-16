import type { GolfCampIconName } from "@/components/GolfCampIcons";

export type AppGuide = {
  slug: string;
  title: string;
  kicker: string;
  accent: string;
  icon: GolfCampIconName;
  summary: string;
  highlights: string[];
  sections: {
    title: string;
    body: string;
    points: string[];
  }[];
};

export const appGuides: AppGuide[] = [
  {
    slug: "getting-started",
    title: "Getting Started",
    kicker: "Start Here",
    accent: "#f4f1ea",
    icon: "rules",
    summary:
      "The Golf Camp app is the operating system for the week: quick updates, official results, player tools, and the stuff that keeps camp moving.",
    highlights: [
      "Use Home as the main menu.",
      "Use your player login so the app knows who you are.",
      "If something feels off, tell Adam or submit App Feedback.",
    ],
    sections: [
      {
        title: "What This App Is",
        body:
          "The app keeps the group connected and gives everyone one place to follow drafts, rounds, wagers, schedules, rooms, scores, and camp lore. It supports the week without trying to overproduce it.",
        points: [
          "It is the best place to check what is happening now.",
          "It is where players submit scores, bets, feedback, and profile updates.",
          "It is where verified/final results become easy to find later.",
        ],
      },
      {
        title: "Login Basics",
        body:
          "Use your assigned login name and PIN. Once logged in, your player identity powers My Profile, Afternoon Rounds ownership, Parimutuel Bets, Shenanigans entries, and feedback.",
        points: [
          "Use Remember Me if you do not want to type your PIN every time.",
          "Use My Profile to change your PIN, photo, contact info, and Years Served.",
          "Logout is available if someone else needs to use the same phone.",
        ],
      },
      {
        title: "If You Are Not A Phone Person",
        body:
          "You do not need to learn the whole app. Most of the time, you only need to open the right card, follow the big button or obvious form, and ask if something looks confusing.",
        points: [
          "Start on Home and tap the card for what you are trying to do.",
          "Use BACK at the top-left if you are in the wrong place.",
          "If you are entering something important, read the button before tapping it.",
          "If you are stuck, ask Adam for app help. Ask Nick for trip or commissioner decisions.",
        ],
      },
      {
        title: "Official vs Useful",
        body:
          "Some areas show live or submitted information before it is final. That is intentional. The app should keep everyone informed while still preserving Nick’s commissioner authority.",
        points: [
          "Unofficial means useful live information.",
          "Verified/final means commissioner-approved.",
          "If a score, bet, or payout looks wrong, ask before settling anything.",
        ],
      },
    ],
  },
  {
    slug: "home",
    title: "Home",
    kicker: "Main Menu",
    accent: "#b98590",
    icon: "camp",
    summary:
      "Home is the front door: LIVE CAMP FEED, GroupMe, and quick access to every module.",
    highlights: [
      "LIVE CAMP FEED is a passive activity ticker.",
      "GroupMe is still the group conversation.",
      "Cards open the tools players actually use.",
    ],
    sections: [
      {
        title: "LIVE CAMP FEED",
        body:
          "LIVE CAMP FEED is meant to make the app feel alive without becoming another chat thread. It shows recent camp activity and admin updates in a compact ticker.",
        points: [
          "Feed items are not clickable.",
          "Admin can post and clean up feed items.",
          "Use it for quick awareness, not full explanations.",
        ],
      },
      {
        title: "GroupMe Camp Chat",
        body:
          "The GroupMe card is the bridge back to the actual group chat. If something needs conversation, jokes, debate, or general chaos, GroupMe is still the place.",
        points: [
          "The card opens the Golf Camp GroupMe link.",
          "On phones, it should open the GroupMe app if installed.",
          "The app does not replace the group chat.",
        ],
      },
      {
        title: "Module Cards",
        body:
          "The main cards are the app’s map. Each one opens a specific part of camp: official rounds, drafts, side games, profiles, schedules, and optional games.",
        points: [
          "Use Camp Office for stable information.",
          "Use Money Rounds and Parimutuel for official money workflows.",
          "Use Shenanigans and Afternoon Rounds for player-created fun.",
        ],
      },
    ],
  },
  {
    slug: "camp-office",
    title: "Camp Office",
    kicker: "Information Desk",
    accent: "#f4f1ea",
    icon: "camp",
    summary:
      "Camp Office is the quiet information center: roster, rooms, schedule, profile, guides, and app feedback.",
    highlights: [
      "Roster and profiles are player-facing.",
      "Daily Schedule is the itinerary board.",
      "App Feedback goes to admin for review.",
    ],
    sections: [
      {
        title: "Camp Roster",
        body:
          "The roster is the player directory. It should feel official and clean, not like a social media profile wall.",
        points: [
          "Player cards show photo, rank, Years Served, and basic identity.",
          "Profiles can include contact download if a phone number exists.",
          "Individual nicknames are intentionally hidden from public player-facing UI.",
        ],
      },
      {
        title: "Daily Schedule",
        body:
          "Daily Schedule is a simple clubhouse itinerary board for Tuesday through Sunday. It is not a calendar app; it is the place to check what is coming up.",
        points: [
          "Empty days still show so the week feels structured.",
          "Admins can add, edit, and delete schedule items.",
          "Use it for meals, tee times, drafts, Night Golf, and other shared events.",
        ],
      },
      {
        title: "My Profile and Feedback",
        body:
          "My Profile is where each player maintains their own info. App Feedback is where players can report bugs, confusing moments, or useful ideas.",
        points: [
          "Players can update PIN, photo, contact info, and Years Served.",
          "Feedback is visible in Admin only.",
          "Tell Adam or submit feedback if the app itself feels wrong.",
        ],
      },
    ],
  },
  {
    slug: "live-draft",
    title: "Live Draft",
    kicker: "Draft Night",
    accent: "#4f8cc9",
    icon: "draft",
    summary:
      "The draft is commissioner-driven. Nick controls picks; everyone else watches the board and follows the room energy.",
    highlights: [
      "Captains do not operate devices during the draft.",
      "TV mode is the main room board.",
      "Mobile view lets players follow along quietly.",
    ],
    sections: [
      {
        title: "How Draft Night Works",
        body:
          "Nick sets up the draft, captains, and order. Once the draft starts, he enters picks as captains make them. The app updates the TV and mobile views.",
        points: [
          "Captain teams can be adjusted manually before the draft starts.",
          "Snake draft logic advances automatically after each pick.",
          "Undo exists for corrections.",
        ],
      },
      {
        title: "TV View",
        body:
          "The TV board is designed for the room. The available player pool is the main strategy surface, with current pick, on deck, last pick, clock, and teams visible for context.",
        points: [
          "The board is read-only.",
          "The pick clock creates pressure but does not enforce anything.",
          "At the end, Draft Complete bridges into Parimutuel Bets.",
        ],
      },
      {
        title: "Scouting Cards",
        body:
          "Scouting Cards are a casual pre-draft browsing experience. They are personality-driven and intentionally fun, not fantasy sports analytics.",
        points: [
          "Cards show player identity, rank, seasons, 2025 performance, and questionnaire answers.",
          "The deck randomizes each time it opens.",
          "Players can save card images to their phones.",
        ],
      },
    ],
  },
  {
    slug: "money-rounds",
    title: "Money Rounds",
    kicker: "Official Morning Rounds",
    accent: "#315f48",
    icon: "money",
    summary:
      "Money Rounds are the official morning scramble rounds. They drive standings, skins, payouts, and the Money Rounds Bank.",
    highlights: [
      "Scores are team-based.",
      "Submitted scores can show publicly before verification.",
      "Final payouts come from verified/finalized results.",
    ],
    sections: [
      {
        title: "What Counts",
        body:
          "Money Rounds are official morning scramble rounds played Wednesday through Saturday. Teams are the scoring unit, and individual accounting is generated from team payouts.",
        points: [
          "Teams enter or submit hole-by-hole scores.",
          "Nick can review, edit, verify, and finalize.",
          "Money Rounds Bank tracks official round winnings only.",
        ],
      },
      {
        title: "How To View A Money Round",
        body:
          "If you just want to see what is happening, you do not need to enter anything. Money Rounds opens with the active round first, then recent rounds and the yearly bank.",
        points: [
          "From Home, tap Money Rounds.",
          "Tap View Round on the active round to see leaderboard, scores, skins, and bank info.",
          "Submitted-but-unverified scores may appear live so the group can follow along.",
          "Look for status labels like Unofficial, Awaiting Verification, Verified, Scored, or Final.",
        ],
      },
      {
        title: "How To Submit Team Scores",
        body:
          "If your team is asked to submit scores, use the team score submission flow. It is meant to feel like a scorecard, not a complicated form.",
        points: [
          "From Money Rounds, open the active round.",
          "Choose Submit Team Scores or Enter Scores.",
          "Select your team.",
          "Enter hole scores in the scorecard boxes. Blank holes do not break the total.",
          "Review OUT, IN, and TOTAL, then tap Submit Scores.",
          "After submitting, your card is Awaiting Verification until Nick reviews it.",
        ],
      },
      {
        title: "Unofficial vs Verified",
        body:
          "The app can show submitted scores immediately so everyone can follow the live leaderboard. That does not mean the scorecard is final.",
        points: [
          "Submitted means live/unofficial.",
          "Verified means commissioner-reviewed.",
          "Final means the round is marked complete for results and presentation.",
        ],
      },
      {
        title: "Skins and Payouts",
        body:
          "Skins are calculated by hole. A skin is awarded only when exactly one team has the lowest score on that hole. No carryovers.",
        points: [
          "If two or more teams tie the low score, that hole produces no skin.",
          "The skins pot is divided evenly by total skins won.",
          "Team payouts and skins are split evenly among team members.",
        ],
      },
      {
        title: "Results Presentation",
        body:
          "The Money Rounds results presentation is the projector-friendly reveal after a completed round.",
        points: [
          "Nick can control the presentation from his phone.",
          "Slides include analytics, standings, skins, player payouts, Parimutuel summary, and closing.",
          "It is read-only and built for the room.",
        ],
      },
    ],
  },
  {
    slug: "parimutuel-bets",
    title: "Parimutuel Bets",
    kicker: "Nightly Betting Ledger",
    accent: "#746a91",
    icon: "calcutta",
    summary:
      "Parimutuel Bets are nightly markets for the next Money Round. The app tracks the ledger all week; players settle one time at the very end of camp.",
    highlights: [
      "No money is collected during camp.",
      "$20 max per player per market per night.",
      "Markets resolve from finalized Money Round results.",
      "No money changes hands until the final camp settlement.",
    ],
    sections: [
      {
        title: "The Basic Idea",
        body:
          "Parimutuel Bets are not a sportsbook and there is no banker. Everyone places bets into markets, the app tracks the ledger, and winning bettors split each market pool proportionally.",
        points: [
          "The app records bets, results, payouts, and balances.",
          "Players settle directly one time at the end of camp via cash, Venmo, or whatever the group agrees on.",
          "There is no pot being physically held during camp.",
        ],
      },
      {
        title: "Nightly Flow",
        body:
          "After a draft is completed, Parimutuel Bets open for the next Money Round. Draft teams become the available betting options for team-based markets.",
        points: [
          "Players choose from dropdowns/lists, not free-typing team names.",
          "Markets stay open until Nick locks betting or tee time passes.",
          "If finalized draft teams change, wagers for that market reset so nobody is betting against stale teams.",
        ],
      },
      {
        title: "How To Place A Bet",
        body:
          "Parimutuel Bets should be mostly tapping, not typing. The market options come from draft teams or app-controlled lists like hole numbers.",
        points: [
          "From Home, tap Parimutuel Bets.",
          "If the rules pop up, read them once and close them.",
          "Open Place Wagers.",
          "Pick a market, such as Money Round Winner or Hardest Hole.",
          "Choose an option from the dropdown or list.",
          "Tap a quick amount like $5, $10, $15, or $20.",
          "Tap Place Bet. The app blocks you if you go over $20 for that market.",
        ],
      },
      {
        title: "How To Check Where You Stand",
        body:
          "You can check nightly standings after markets are resolved, but remember: no one pays until the final end-of-camp settlement.",
        points: [
          "Open Parimutuel Bets.",
          "Open Ledger & Settlement.",
          "Use the nightly view to see a specific night.",
          "Use Week To Date to see the running ledger.",
          "Use Final Settlement only at the end of camp after all markets are resolved.",
        ],
      },
      {
        title: "Markets",
        body:
          "Markets are Golf Camp-specific and tied to the next Money Round. Players can place multiple bets as long as they stay within the market limit.",
        points: [
          "Money Round Winner.",
          "Most Birdies.",
          "Show or Better / Top 3.",
          "2nd to Last Place, Hardest Hole, Easiest Hole, and tiebreaker-style markets.",
        ],
      },
      {
        title: "Limits and Payouts",
        body:
          "Each player has a $20 maximum per market per night. Winning bettors split that market’s pool proportionally based on their winning bet amounts.",
        points: [
          "A $20 winning bet earns twice the share of a $10 winning bet in the same market.",
          "Losing bets stay in that market pool.",
          "Nightly standings and Money Round presentation highlights can show how people are doing, but final settlement is end-of-camp only.",
        ],
      },
      {
        title: "Resolution and Settlement",
        body:
          "Once Nick finalizes the linked Money Round, the app can resolve that night’s Parimutuel markets from official results. Those results can appear as highlights, but the actual payment settlement waits until the end of camp.",
        points: [
          "No one needs to manually calculate the market if official round data exists.",
          "The final settlement should happen from the full-week app ledger, not memory.",
          "If something looks off, pause and ask before paying.",
        ],
      },
    ],
  },
  {
    slug: "shenanigans",
    title: "Shenanigans",
    kicker: "Side Game Points",
    accent: "#EB9C5C",
    icon: "shenanigans",
    summary:
      "Shenanigans is a point-based side game system inside specific game sessions, built for quick foursome scoring.",
    highlights: [
      "Start or select the correct game first.",
      "Log Points is for fast good/bad moments.",
      "Settlement is minimized for the selected game.",
    ],
    sections: [
      {
        title: "Game Sessions",
        body:
          "Shenanigans happens inside game sessions. That keeps one foursome’s points separate from another group’s points.",
        points: [
          "Start a game and select the participating players.",
          "Switch games if you are viewing or following another group.",
          "Do not treat full-camp totals as the current game.",
        ],
      },
      {
        title: "How To Start A Shenanigans Game",
        body:
          "Start a game when your group wants to track points. This is usually for a foursome, but the app can handle different group sizes.",
        points: [
          "From Home, tap Shenanigans.",
          "Tap Start Game.",
          "Name the game something recognizable, like Wednesday Front 9.",
          "Search or tap the players in the game.",
          "Start the game. Each player begins with the configured starting points.",
          "Make sure the current game pill shows the game you are actually using.",
        ],
      },
      {
        title: "Log Points",
        body:
          "Log Points is designed to reduce typing. Pick one player, pick the hole, select good/bad events, set the point value, and add text only when needed.",
        points: [
          "Open Shenanigans and make sure the correct game is selected.",
          "Tap Log Points.",
          "Choose one player.",
          "Choose the hole number.",
          "Tap the good or bad event buttons that apply.",
          "Choose the point value.",
          "Use the description box only for weird stuff that needs extra context.",
          "Tap Submit. The ledger should now show the point event.",
        ],
      },
      {
        title: "Wagers and Side Games",
        body:
          "Wagers and Side Games are their own flows. That keeps Log Points from becoming a junk drawer.",
        points: [
          "Use Wagers for direct player-to-player Shenanigans wagers.",
          "Use Side Games for Bocce, Basket-Golf, and similar group games.",
          "Use Ledger to review what happened.",
        ],
      },
      {
        title: "Settlement",
        body:
          "Settlement calculates player totals for the selected game and turns them into minimized payment rows.",
        points: [
          "Open Shenanigans and select the correct game.",
          "Tap Settlement.",
          "Set the dollar-per-point multiplier.",
          "Review totals by player.",
          "Positive players collect; negative players pay.",
          "The app reduces payments so people are not making unnecessary transfers.",
        ],
      },
    ],
  },
  {
    slug: "afternoon-rounds",
    title: "Afternoon Rounds",
    kicker: "Player-Created Games",
    accent: "#ffda03",
    icon: "p2p",
    summary:
      "Afternoon Rounds are optional player-created golf games, separate from official Money Rounds.",
    highlights: [
      "Round owner controls only their round.",
      "Flexible teams and participant counts are allowed.",
      "Finalized rounds can show settlement.",
    ],
    sections: [
      {
        title: "What They Are",
        body:
          "Afternoon Rounds are casual/social rounds. They can be 1v1, 2v2, uneven teams, foursome games, or larger groups. They do not affect official Money Rounds Bank totals.",
        points: [
          "The creator becomes the round owner.",
          "Admins can override any round if needed.",
          "Regular players can view rounds they do not own.",
        ],
      },
      {
        title: "How To Create An Afternoon Round",
        body:
          "The person who creates an Afternoon Round owns that round. That means they can set it up, enter scores, finalize it, and delete it if needed.",
        points: [
          "From Home, tap Afternoon Rounds.",
          "Use Create Afternoon Round.",
          "Give it a simple name, like Wednesday Afternoon 2v2.",
          "Select the players participating.",
          "Create the round, then open it from Active Afternoon Rounds.",
          "If someone else created the round, you may be able to view it but not edit it.",
        ],
      },
      {
        title: "Setup",
        body:
          "The owner selects participants, builds teams, and optionally sets buy-ins and payouts.",
        points: [
          "Add or remove participants first.",
          "Create teams from the selected participants.",
          "Teams can be uneven if the group wants that.",
          "Set buy-in and payout terms only if the group is using money.",
          "Money terms lock after creation unless deliberately unlocked.",
        ],
      },
      {
        title: "How To Enter Scores",
        body:
          "Scores are entered by team using the same golf scorecard logic as the rest of the app.",
        points: [
          "Open the round.",
          "Find the team scorecard.",
          "Enter scores hole by hole.",
          "Blank holes are ignored for partial score-to-par.",
          "Lower score is better.",
          "Save the team scores.",
        ],
      },
      {
        title: "How To Finalize And Settle",
        body:
          "Finalizing tells the app the round is ready for settlement guidance. It does not permanently lock everything forever.",
        points: [
          "Review teams, scores, buy-ins, payouts, and skins.",
          "Tap Finalize Afternoon Round.",
          "Once finalized, look for the settlement card.",
          "Use the payment rows to settle that specific Afternoon Round.",
          "If something is wrong, the owner or admin can reopen and correct it.",
        ],
      },
      {
        title: "Settlement",
        body:
          "Once finalized, the settlement card tells players who should pay or collect based on that Afternoon Round’s buy-ins, payouts, skins, and scores.",
        points: [
          "It is separate from Money Rounds Bank.",
          "It is meant for casual games only.",
          "If the group changes terms, unlock/update carefully before settling.",
        ],
      },
    ],
  },
  {
    slug: "night-golf",
    title: "Night Golf",
    kicker: "After Dark",
    accent: "#ec4899",
    icon: "night",
    summary:
      "Night Golf is its own dark-only experience with a compact 3x3 score entry grid and leaderboard.",
    highlights: [
      "Score entry is nine boxes.",
      "Blank boxes count as zero.",
      "Sudden Death handles ties.",
    ],
    sections: [
      {
        title: "Score Entry",
        body:
          "Night Golf score entry uses a 3x3 grid: three rows and three color columns. It is designed to be fast in low light.",
        points: [
          "From Home, tap Night Golf.",
          "Choose the night.",
          "Tap Submit Score.",
          "Select the player from the dropdown.",
          "Enter the nine scores in the colored grid.",
          "Blank boxes count as zero.",
          "Review the total at the top, then submit.",
        ],
      },
      {
        title: "Scoring Rules",
        body:
          "Night Golf has its own scoring rules and target colors. Hole-Out is worth 5 points.",
        points: [
          "Green, orange, and red boxes match the target color columns.",
          "Maximum possible score is intentionally not emphasized.",
          "Admin can clean up bad entries if needed.",
        ],
      },
      {
        title: "Tiebreaker",
        body:
          "Ties use Sudden Death in an Open-style format. Tied players start at the first hole and the worst point total is eliminated until one winner remains.",
        points: [
          "Sudden Death is a format instruction, not an automatic app calculation.",
          "Use the leaderboard to identify ties.",
          "Let the room and rules settle the final winner.",
        ],
      },
    ],
  },
];

export function getAppGuide(slug: string) {
  return appGuides.find((guide) => guide.slug === slug) || null;
}
