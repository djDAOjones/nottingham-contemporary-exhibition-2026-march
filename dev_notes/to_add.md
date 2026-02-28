Factor these into dev_plan

1) audience submission page needs to be stripped of all but the most essential text, and the ui needs to be WCAG AAA. ensure this is done in a way that maintains the computationally efficient, well documented, and modular approach that adheres to IBM carbon, WCAG AAA, and Nielsen normal 10 heuristics for UX.

2) make tge IP address population in vercel automatic and part of the boot process. there needs to be a boot/reboot script that sorts everything and maintains the current session of audience input, and another that starts a new session. the session can be identified by a unique ID and/or date (your reccomendation is welcome)

3) potentially send a snapshot of the main screen video output to the users browser ui once their request has fully appear on the screen. keep the user screen updated with stages "sending", "processing", "waiting for response", "waiting for approval", "approved", "rejected", "error", "routing to display", "displaying", "archived" and maybe have a minmu time of 3 seconds for each stage so user experiences progress in the experience rather than it blitz in 5 seconds and be unreadable.