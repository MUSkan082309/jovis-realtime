const JOKES: string[] = [
  "Why did the computer go to the doctor? Because it had a virus, sir.",
  "I would tell you a joke about UDP, but you might not get it.",
  "Why do programmers prefer dark mode? Because light attracts bugs.",
  "There are only 10 types of people in the world: those who understand binary, and those who do not.",
  "Why was the JavaScript developer sad? Because they didn't Node how to Express themselves.",
  "I asked my computer for a joke, but it just gave me a 404. Humour not found.",
  "Why did the CPU cross the road? To get to the other core.",
  "A SQL query walks into a bar, approaches two tables, and asks: may I join you?",
  "I told my server a joke about a broken disk. It didn't register.",
  "Why did the robot go on a diet? It had a byte too many.",
  "Parallel lines have so much in common. It is a shame they will never meet.",
  "I would make a joke about an infinite loop, but we would be here forever.",
];

export function randomJoke(): string {
  return JOKES[Math.floor(Math.random() * JOKES.length)];
}

const FACTS: string[] = [
  "The human brain processes images in as little as 13 milliseconds, sir.",
  "There are over 700 programming languages, though only a handful are widely used.",
  "The first computer bug was an actual moth, found in a relay in 1947.",
  "Approximately 90 percent of the world's data has been created in the last few years.",
  "The average modern smartphone has more computing power than NASA had during the moon landing.",
  "More than 70 percent of all internet traffic now comes from automated bots and scripts.",
];

export function randomFact(): string {
  return FACTS[Math.floor(Math.random() * FACTS.length)];
}
