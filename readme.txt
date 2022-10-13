/*This read me is intended for @auditor only. 
Not intended for public viewing.


Thank you for your help! I WILL GLADLY help in any way I can. I will GLADLY answer questions sent to me, or join a zoom/discord screen share and go over things with you. As a side note, I looked at your offered gigs and we have a lot in common. I am a Solidity/Unity programmer focused on making blockchain games and blockchain business apps. I have two additional game prototypes I want to finish soon. It is likely that our paths will cross again in the future. Feel free to add me on socials and or contact me with any other opportunities you see, and I will do the same. 

Here is my contact info for questions about this project or anything else.
Jordan Tockey
JTockey8@Gmail.com
Discord: Jordy#0723
Linkedin: https://www.linkedin.com/in/jordan-tockey-66313a14/
*/

I am calling this project "Fight or Flee" (working title). It is a game about risk management. Players buy supplies and then risk those supplies by “exploring.” The ether used to buy supplies is stored in the contract. That pool of ether is owned by all people who own supplies. The ownership structure is like shares of a company. When people risk supplies and “lose” shares of the pool are “burnt” increasing the value of all other shares, when players “win” new shares are created as a reward. You can play actively by risking shares or play passively by holding shares while others risk theirs.

To begin, players mint an NFT and buy supplies, they pay the share price plus a 20% “tax.” The NFT will be assigned a number between 0-2 which acts like a rock, paper, scissors minigame, that number never changes.  When they want to explore they choose an amount and risk it by calling the explore() function. A random number between 0-2 is rolled for the current enemy, additionally, a 0-99 number is rolled for a target number. If the player's rock/paper/scissors beat the enemy an advantage of -10 is added to the target. If the enemy beats the player a disadvantage of +10 is added to the target number. If -10 or +10 guarantees a win or loss for the player the round is resolved immediately. If not the player has a choice to fight or flee. Fleeing players lose half of the funds that were risked in exploring, players would flee if their target number is very low. Otherwise, players can fight, in which case another random number is generated. If the new random number is lower or equal to the target the player wins and doubles the amount that was risked, if the new number is higher than the target the player loses and all risked funds are burnt. 

Code concerns:
Please do not publish code to live blockchain or testnet. If local machine testing is not possible please contact me first.
I am concerned about front-running the RNG calls. Could a player see if they win or lose and race another transaction through first? 
Am I transferring funds out of contract in a safe manner
Overflow in general
Is renetrancy() a potential issue on topup() line 65
Can you break the _totalSupplies and or Character[_uid].stash and backpack
