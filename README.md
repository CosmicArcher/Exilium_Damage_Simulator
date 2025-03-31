Access the calculator here \
https://cosmicarcher.github.io/Exilium_Damage_Simulator/FullSim.html
\
Currently, effort is focused on adding new features to the turn-by-turn simulator, the simple and automated support calculator pages might break as the code changes \
\
Features present in Turn-by-Turn Simulator:
- Papasha Summon inheriting her base stats
- Buffs from corresponding skills automatically applied to final stats
- Consumable buffs removed upon respective triggers
- Turn based buffs tick down after action
- Edifice buff granting all dolls Siege buff upon cleanse
- Suomi Avalanche stacks automatically increase and deal stability damage and reset to 0 upon reaching max
- Extra Actions from skills implemented
- Skill costs and cooldowns automated
- Current index tracked
- Doll passives and extra skill effects based on a condition trigger automated for certain dolls
- Target stability tracking and automated regeneration after 2 turns
- Enemy attack button to trigger intercept and counterattack skills automatically, assumes that the attack meets the conditions for counterattacks
- Cover is implemented as a set value that points in all directions
- Stat and buff editing mid-simulation
- Critical settings for each doll that can be changed any time; always crit, never crit, randomized based on crit chance, expected damage based on crit chance and crit damage (flagged as crit for dps-tracking)
- Keys for most important dolls except for Dushevnaya, Centaureissi, and Klukai
- Log displaying buff application, buff consumption, damage dealt, critical hit or not, remaining stability, stability regeneration
- Round tracking, gunsmoke ends after round 7 or start of round 8 if any damage over time effects are present
- Rewind button, undo the last action, does not remove thoses entries from the action log but will reflect on the status cards on the left column in skill cooldowns, current stability, index, buffs, etc
- Line chart showing total damage dealt by each doll as the simulation goes on with a legend and colors matching their respective status cards on the left column

To Do List :
- Weapon passives
- Phase strike conditional damage increase
- Some dolls' keys and automated passives and skill condition checking, mostly unimportant dolls for gunsmoke except for Dushevnaya, Centaureissi, and Klukai
- Buff skills that target a specific ally, all allies buffing skills implemented already
- Buff incompatibilities like defense down 1, 2, and acid corrosion debuffs cannot coexist, only one should be present at any given time
- Editing turns needed to regenerate stability, standard is 2 turns for most bosses but some regenerate in 1 turn, or never regenerate at all
- Changing the DPS chart to view specific dolls' damage breakdown (damage per skill, damage per type, crit vs non-crit damage, etc)
- Random buffs from Cheeta ult and certain AR weapon traits
- Weird quirks that are present in the game, like Cheeta skill2 under certain conditions grant 2 avalanche stacks rather than 1, since the goal is to simulate the game scenario in a faster manner, this is valuable
- Presets for faster input in the multitude of input fields
- Improve UI
- Error prevention on some buttons being active in situations that would cause errors if clicked
- Create another page with a grid for the map to more accurately simulate game conditions and automate condition checks for "move x or more/less tiles" additional skill effects
