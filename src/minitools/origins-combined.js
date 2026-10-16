// "What it is about" and "Where it comes from" for the minitools that combine
// several equations. No DOM. The conventions are described at the top of
// origins-mechanics.js.

const T = String.raw;

// The first three steps of every circular-orbit derivation.
const orbitStart = [
  [
    T`A satellite in a circular orbit is moving in a circle, and anything moving in a circle needs a net force towards the centre equal to $\frac{mv^2}{r}$, where $m$ is its mass, $v$ its speed and $r$ the radius of the circle.`,
    T`F_{\text{needed}} = \frac{mv^2}{r}`,
  ],
  [
    T`In space there is no air and no string. The only force on the satellite is the pull of gravity from the central body of mass $M$, which Newton's law of gravitation gives. It points towards the centre of the orbit.`,
    T`F_{\text{gravity}} = \frac{GMm}{r^2}`,
  ],
  [
    T`Since gravity is the only force, gravity must be exactly the force that the circular motion needs. Set the two equal.`,
    T`\frac{GMm}{r^2} = \frac{mv^2}{r}`,
  ],
  [
    T`Both sides are multiplied by the satellite's mass $m$. Divide both sides by $m$ and it cancels. This means the orbit is the same for a heavy satellite as for a light one.`,
    T`\frac{GM}{r^2} = \frac{v^2}{r}`,
  ],
  [
    T`Multiply both sides by $r$. On the right, the $r$ cancels the one underneath. On the left, $r$ divided by $r^2$ leaves one $r$ underneath, because $r^2$ is $r \times r$.`,
    T`\frac{GM}{r} = v^2`,
  ],
];

export const combined = {
  "kepler-third-law": {
    about: T`Kepler's third law links the time a planet or satellite takes to complete one orbit to the size of the orbit. Larger orbits take longer, and not just in proportion: the square of the period goes with the cube of the radius. Johannes Kepler found the pattern in 1619 from measurements of the planets; Newton later showed it follows from gravity. It lets astronomers find the mass of a planet or star just by timing something that orbits it.`,
    idea: T`For a circular orbit, gravity supplies the force needed for circular motion. Set them equal, then replace the speed by circumference divided by period.`,
    origin: [
      ...orbitStart,
      [
        T`We want the period $T$ (the time for one orbit) rather than the speed. In one orbit the satellite travels the circumference, $2\pi r$, and speed is distance divided by time.`,
        T`v = \frac{2\pi r}{T}`,
      ],
      [
        T`The last orbit equation has $v^2$, so square both sides of this. Squaring a fraction squares every factor in it: $2^2 = 4$, $\pi^2$ stays as $\pi^2$, and so on.`,
        T`v^2 = \frac{4\pi^2 r^2}{T^2}`,
      ],
      [
        T`Now there are two expressions equal to $v^2$, so they are equal to each other. Write the new one in place of $v^2$ in the orbit equation.`,
        T`\frac{GM}{r} = \frac{4\pi^2 r^2}{T^2}`,
      ],
      [
        T`To make $T^2$ the subject, first bring it off the bottom by multiplying both sides by $T^2$.`,
        T`\frac{GM\,T^2}{r} = 4\pi^2 r^2`,
      ],
      [
        T`Multiply both sides by $r$ to remove the division on the left. On the right, $r^2 \times r = r^3$.`,
        T`GM\,T^2 = 4\pi^2 r^3`,
      ],
      [
        T`$T^2$ is multiplied by $GM$. Divide both sides by $GM$.`,
        T`T^2 = \frac{4\pi^2}{GM}\,r^3`,
      ],
      [
        T`For everything orbiting the same body, $\frac{4\pi^2}{GM}$ is a fixed number. So $T^2$ is a fixed number times $r^3$: the square of the period is proportional to the cube of the radius, which is Kepler's third law.`,
        T`T^2 \propto r^3`,
      ],
    ],
  },
  "orbital-speed": {
    about: T`A satellite in a circular orbit must travel at exactly the right speed for its height. Too slow and it falls inward; too fast and it climbs outward. This equation gives that speed. It depends only on the mass of the body being orbited and the radius of the orbit, not on the satellite itself. Perhaps surprisingly, satellites further out move more slowly.`,
    idea: T`Gravity supplies the force needed for circular motion. Set the two equal and solve for the speed.`,
    origin: [
      ...orbitStart,
      [
        T`Write it with $v^2$ on the left.`,
        T`v^2 = \frac{GM}{r}`,
      ],
      [
        T`To undo the squaring, take the square root of both sides. (Only the positive root is wanted, since a speed is not negative.)`,
        T`v = \sqrt{\frac{GM}{r}}`,
      ],
      [
        T`A larger $r$ makes the fraction smaller, so the speed is lower in a higher orbit. The International Space Station, 400 km up, does about 7.7 km/s; the Moon, nearly sixty times further from the Earth's centre, about 1 km/s.`,
        T`r \text{ larger} \;\Rightarrow\; v \text{ smaller}`,
      ],
    ],
  },
  "geostationary-orbit": {
    about: T`A geostationary satellite stays above the same spot on the equator, so from the ground it appears to hang still in the sky. That is why a satellite dish can be fixed to a wall and never needs to track. To do this the satellite must orbit in exactly the time the planet takes to spin once. There is only one orbit radius where that happens, and this equation finds it.`,
    idea: T`Set the orbit's period equal to the planet's day, then rearrange Kepler's third law to find the radius.`,
    origin: [
      [
        T`To stay above one point on the ground, the satellite must go round once in exactly the time the planet takes to turn once. So its period $T$ is the length of the planet's day.`,
        T`T_{\text{orbit}} = T_{\text{planet's day}}`,
      ],
      [
        T`The period and radius of any circular orbit are tied together by Kepler's third law (see that tool for where it comes from).`,
        T`T^2 = \frac{4\pi^2}{GM}\,r^3`,
      ],
      [
        T`We know $T$ and want $r$. First remove the division by multiplying both sides by $GM$.`,
        T`GM\,T^2 = 4\pi^2 r^3`,
      ],
      [
        T`$r^3$ is multiplied by $4\pi^2$. Divide both sides by $4\pi^2$.`,
        T`\frac{GM\,T^2}{4\pi^2} = r^3`,
      ],
      [
        T`Write it with $r^3$ on the left.`,
        T`r^3 = \frac{GM\,T^2}{4\pi^2}`,
      ],
      [
        T`$r$ is cubed. The opposite of cubing is taking the cube root, so take the cube root of both sides.`,
        T`r = \sqrt[3]{\frac{GM\,T^2}{4\pi^2}}`,
      ],
      [
        T`$r$ is measured from the centre of the planet. To get the height above the ground, subtract the planet's own radius $R$.`,
        T`h = r - R`,
      ],
      [
        T`For the Earth the day to use is the sidereal day, 86 164 s: one turn measured against the stars, about four minutes shorter than 24 hours. That gives $r$ of about 42 200 km, which is 35 800 km above the ground.`,
        T`h \approx 4.22 \times 10^{7} - 6.37 \times 10^{6} = 3.58 \times 10^{7}\ \text{m}`,
      ],
    ],
  },
  "escape-speed": {
    about: T`Throw a ball upwards and it comes back. Throw it faster and it goes higher before returning. Escape velocity is the launch speed at which it would never come back, coasting away for ever with gravity slowing it but never quite stopping it. For the Earth's surface it is about 11 km/s. It depends only on the mass of the planet and the distance from its centre, and is the same for a pebble as for a spacecraft. (Strictly it is a speed: the direction does not matter, as long as the path does not hit the planet.)`,
    idea: T`Use conservation of energy. The object needs just enough kinetic energy at launch to bring its total energy up to zero, the value it would have at rest infinitely far away.`,
    origin: [
      [
        T`An object coasting near a planet has two kinds of energy: kinetic energy, $\tfrac{1}{2}mv^2$, and gravitational potential energy, which at a distance $r$ from the planet's centre is $-\frac{GMm}{r}$ (negative, with zero at infinity). Its total energy is the two added together.`,
        T`E_{\text{total}} = \tfrac{1}{2}mv^2 - \frac{GMm}{r}`,
      ],
      [
        T`After launch there is no engine and (we assume) no air, so nothing adds or removes energy. The total stays the same all the way out: kinetic energy is steadily traded for potential energy.`,
        T`E_{\text{total}} \text{ stays constant}`,
      ],
      [
        T`"Only just escaping" means reaching a very great distance with no speed left. There the kinetic energy is zero (not moving) and the potential energy is zero (infinitely far away). So the total there is zero.`,
        T`E_{\text{total}} = 0 + 0 = 0`,
      ],
      [
        T`Since the total never changes, it must have been zero at launch too.`,
        T`\tfrac{1}{2}mv^2 - \frac{GMm}{r} = 0`,
      ],
      [
        T`Add $\frac{GMm}{r}$ to both sides. This says the launch kinetic energy must exactly pay off the "debt" of negative potential energy.`,
        T`\tfrac{1}{2}mv^2 = \frac{GMm}{r}`,
      ],
      [
        T`Both sides are multiplied by $m$, the mass of the object. Divide both sides by $m$ and it cancels, so the escape speed is the same whatever is launched.`,
        T`\tfrac{1}{2}v^2 = \frac{GM}{r}`,
      ],
      [
        T`Multiply both sides by 2 to remove the half.`,
        T`v^2 = \frac{2GM}{r}`,
      ],
      [
        T`Take the square root of both sides to undo the squaring.`,
        T`v = \sqrt{\frac{2GM}{r}}`,
      ],
      [
        T`Compare this with the speed for a circular orbit at the same distance, $\sqrt{\frac{GM}{r}}$. The only difference is the 2 under the root, so escape speed is $\sqrt{2}$ (about 1.41) times the orbital speed.`,
        T`v_{\text{escape}} = \sqrt{2} \times v_{\text{orbit}}`,
      ],
    ],
  },
  "cyclotron-motion": {
    about: T`A charged particle that moves across a magnetic field is pushed sideways all the time, and the result is that it travels in a circle. This equation gives the radius of the circle. Faster or heavier particles make bigger circles; a stronger field or a bigger charge makes tighter ones. Particle accelerators, mass spectrometers and the "magnetic bottles" that hold hot plasma all depend on it.`,
    idea: T`The magnetic force is always at right angles to the motion, so it acts as the centripetal force. Set the magnetic force equal to the force needed for circular motion.`,
    origin: [
      [
        T`A charge $q$ moving at speed $v$ straight across a magnetic field $B$ feels a force of size $qvB$.`,
        T`F = qvB`,
      ],
      [
        T`This force is always at right angles to the velocity. A sideways push cannot speed something up or slow it down; it can only turn it. And because the push stays at right angles as the particle turns, the particle keeps turning at the same rate: it moves in a circle at a steady speed.`,
        T`F \perp v \quad\Rightarrow\quad \text{circle at steady speed}`,
      ],
      [
        T`Anything moving in a circle of radius $r$ at speed $v$ needs a net force towards the centre of this size:`,
        T`F_{\text{needed}} = \frac{mv^2}{r}`,
      ],
      [
        T`The magnetic force is the only force on the particle, so it must be exactly the force that the circular motion needs. Set the two equal.`,
        T`qvB = \frac{mv^2}{r}`,
      ],
      [
        T`Both sides contain $v$. Divide both sides by $v$. On the left it cancels; on the right, $v^2$ divided by $v$ leaves one $v$.`,
        T`qB = \frac{mv}{r}`,
      ],
      [
        T`To get $r$ off the bottom, multiply both sides by $r$.`,
        T`qBr = mv`,
      ],
      [
        T`$r$ is multiplied by $qB$. Divide both sides by $qB$.`,
        T`r = \frac{mv}{qB}`,
      ],
      [
        T`The top line, $mv$, is the particle's momentum: more momentum is harder to bend, so the circle is larger. A stronger field or a bigger charge gives a bigger force and a tighter circle.`,
        T`r = \frac{\text{momentum}}{qB}`,
      ],
      [
        T`A bonus result: the time for one lap is the circumference divided by the speed. Putting in $r = \frac{mv}{qB}$, the $v$ cancels, so fast and slow particles take the same time to go round. Cyclotron accelerators rely on this.`,
        T`T = \frac{2\pi r}{v} = \frac{2\pi}{v} \times \frac{mv}{qB} = \frac{2\pi m}{qB}`,
      ],
    ],
  },
  "velocity-selector": {
    about: T`A velocity selector picks out particles of one particular speed from a beam containing many speeds. It uses an electric field and a magnetic field at right angles to each other, arranged so that they push a charged particle in opposite directions. Only particles going at exactly the right speed feel balanced forces and travel straight through; the rest are bent aside. It is the first stage of many mass spectrometers.`,
    idea: T`For a particle to go straight, the electric force and the magnetic force on it must be equal and opposite.`,
    origin: [
      [
        T`The particle, with charge $q$, passes between two plates that make an electric field $E$. The electric force on a charge is the charge times the field, and it does not depend on how fast the particle is moving.`,
        T`F_E = qE`,
      ],
      [
        T`The same region also has a magnetic field $B$, at right angles to the particle's path. The magnetic force on a moving charge is $qvB$, so it is larger for faster particles. The field's direction is chosen so that this force is opposite to the electric force.`,
        T`F_B = qvB`,
      ],
      [
        T`By Newton's first law, the particle carries on in a straight line only if there is no net force on it. With two forces in opposite directions, that means they must be equal in size.`,
        T`qE = qvB`,
      ],
      [
        T`Both sides are multiplied by $q$. Divide both sides by $q$ and it cancels. So the selected speed is the same whatever the charge (or the mass) of the particle.`,
        T`E = vB`,
      ],
      [
        T`$v$ is multiplied by $B$. Divide both sides by $B$, and write it with $v$ on the left.`,
        T`v = \frac{E}{B}`,
      ],
      [
        T`What about the others? A faster particle has a bigger magnetic force but the same electric force, so it is pushed to the magnetic side. A slower one has a smaller magnetic force and is pushed to the electric side. Only those at $v = \frac{E}{B}$ get through the exit slit.`,
        T`v > \frac{E}{B}: F_B > F_E, \qquad v < \frac{E}{B}: F_B < F_E`,
      ],
    ],
  },
  "mass-spectrometer": {
    about: T`A mass spectrometer sorts atoms and molecules by mass. The particles are first given an electric charge (turned into ions), then accelerated by a voltage, then sent into a magnetic field that bends them round in a curve. Heavier ions are harder to bend and follow a wider curve, so ions of different mass land in different places. Chemists use it to identify substances, and it was how isotopes were first discovered.`,
    idea: T`Two stages. Energy conservation gives the speed after acceleration; circular motion in the magnetic field gives the radius. Then put the first result into the second.`,
    origin: [
      [
        T`Stage one: acceleration. An ion with charge $q$ starts from rest and moves through a potential difference $V$. Potential difference is energy per coulomb, so the energy given to the ion is $qV$. In a vacuum all of it becomes kinetic energy.`,
        T`qV = \tfrac{1}{2}mv^2`,
      ],
      [
        T`Make $v$ the subject. First multiply both sides by 2 to remove the half.`,
        T`2qV = mv^2`,
      ],
      [
        T`$v^2$ is multiplied by $m$. Divide both sides by $m$.`,
        T`v^2 = \frac{2qV}{m}`,
      ],
      [
        T`Take the square root of both sides to undo the squaring.`,
        T`v = \sqrt{\frac{2qV}{m}}`,
      ],
      [
        T`Stage two: bending. The ion enters a magnetic field $B$ at right angles to its path. The magnetic force acts as the centripetal force and bends it into a circle whose radius is (see "Charged particle in a magnetic field"):`,
        T`r = \frac{mv}{qB}`,
      ],
      [
        T`The speed in stage two is the speed it left stage one with. So write the expression for $v$ from stage one in place of $v$ here.`,
        T`r = \frac{m}{qB} \times \sqrt{\frac{2qV}{m}}`,
      ],
      [
        T`This is correct but untidy, with $m$ and $q$ both inside and outside the root. To combine them, move $\frac{m}{q}$ inside the square root. A number outside a root can be written inside it if it is squared first, because $\sqrt{x^2} = x$. So $\frac{m}{q}$ becomes $\frac{m^2}{q^2}$ inside.`,
        T`r = \frac{1}{B}\sqrt{\frac{m^2}{q^2} \times \frac{2qV}{m}}`,
      ],
      [
        T`Now simplify inside the root. $m^2$ on top and $m$ underneath leave one $m$ on top. $q$ on top and $q^2$ underneath leave one $q$ underneath.`,
        T`r = \frac{1}{B}\sqrt{\frac{2mV}{q}}`,
      ],
      [
        T`For ions with the same charge, in the same field and accelerated by the same voltage, the radius depends only on the mass: it is proportional to the square root of the mass. An ion four times as heavy follows a circle twice as wide.`,
        T`r \propto \sqrt{m}`,
      ],
    ],
  },
  "electron-gun": {
    about: T`An electron gun produces a beam of fast electrons by letting them "fall" through a voltage, in the same way a ball speeds up falling through a height. It was the heart of old televisions and oscilloscopes and is still used in electron microscopes and X-ray tubes. The equation gives the speed of any charged particle after it has been accelerated from rest through a potential difference.`,
    idea: T`Use conservation of energy: the electrical energy given to the charge becomes its kinetic energy.`,
    origin: [
      [
        T`A charge $q$ moves from one plate to another, through a potential difference $V$. Potential difference is the energy transferred for each coulomb, so the energy given to a charge of $q$ coulombs is:`,
        T`W = qV`,
      ],
      [
        T`The charge starts from rest. In a vacuum there is nothing to take energy away, so all of that energy ends up as its kinetic energy, $\tfrac{1}{2}mv^2$.`,
        T`qV = \tfrac{1}{2}mv^2`,
      ],
      [
        T`Make $v$ the subject. First multiply both sides by 2 to remove the half.`,
        T`2qV = mv^2`,
      ],
      [
        T`$v^2$ is multiplied by $m$. Divide both sides by $m$.`,
        T`\frac{2qV}{m} = v^2`,
      ],
      [
        T`Write it with $v^2$ on the left.`,
        T`v^2 = \frac{2qV}{m}`,
      ],
      [
        T`Take the square root of both sides to undo the squaring.`,
        T`v = \sqrt{\frac{2qV}{m}}`,
      ],
      [
        T`The distance between the plates does not appear. Plates closer together give a stronger field and a bigger force, but over a shorter distance, and the work done comes out the same. Only the voltage matters.`,
        T`v = \sqrt{\frac{2qV}{m}} \quad \text{(whatever the gap)}`,
      ],
      [
        T`For real electrons this gives a tenth of the speed of light at only about 2500 V. At much higher voltages relativity must be used, because this equation then overestimates the speed.`,
        T`v \ll c \quad \text{for this equation to hold}`,
      ],
    ],
  },
  "deflection-between-plates": {
    about: T`Fire a charged particle sideways into the gap between two charged plates and its path bends: it keeps its forward speed while being pushed steadily across. This is exactly like a ball thrown horizontally under gravity, and the path is the same shape, a parabola. The equation gives how far the particle has been pushed sideways by the time it leaves the plates. If that is more than the space available, it hits a plate first.`,
    idea: T`Treat the motion along the plates and the motion across them separately. Along: steady speed. Across: steady acceleration from rest. The time spent between the plates links the two.`,
    origin: [
      [
        T`The voltage $V$ across plates a distance $d$ apart makes a uniform electric field in the gap.`,
        T`E = \frac{V}{d}`,
      ],
      [
        T`The force on a charge in a field is the charge times the field. Write $\frac{V}{d}$ in place of $E$.`,
        T`F = qE = \frac{qV}{d}`,
      ],
      [
        T`Newton's second law, $F = ma$, rearranged by dividing both sides by $m$, gives the acceleration as force divided by mass. Dividing $\frac{qV}{d}$ by $m$ puts $m$ on the bottom line as well. This acceleration points straight across the gap and is the same everywhere between the plates.`,
        T`a = \frac{F}{m} = \frac{qV}{md}`,
      ],
      [
        T`Now the motion along the plates. The force is entirely across the gap, so nothing changes the particle's speed along the plates: it keeps its entry speed $u$. The time to travel the length $L$ of the plates is distance divided by speed.`,
        T`t = \frac{L}{u}`,
      ],
      [
        T`Next the motion across the gap. The particle enters with no sideways velocity and has a steady sideways acceleration $a$. The equation of motion $s = ut + \tfrac{1}{2}at^2$, with a starting velocity of zero in this direction, gives the sideways distance $y$.`,
        T`y = \tfrac{1}{2}at^2`,
      ],
      [
        T`Write the expression for $a$ from the third step, and $\frac{L}{u}$ for $t$ from the fourth. The time is squared, so the whole fraction $\frac{L}{u}$ is squared.`,
        T`y = \tfrac{1}{2} \times \frac{qV}{md} \times \left(\frac{L}{u}\right)^2`,
      ],
      [
        T`Squaring a fraction squares its top and its bottom.`,
        T`y = \tfrac{1}{2} \times \frac{qV}{md} \times \frac{L^2}{u^2}`,
      ],
      [
        T`Multiply the fractions: all the top lines together and all the bottom lines together.`,
        T`y = \frac{qVL^2}{2mdu^2}`,
      ],
      [
        T`The particle starts midway between the plates, so it has only $\frac{d}{2}$ of room. If the equation gives a $y$ larger than that, the particle reaches a plate before the end, and the picture shows where.`,
        T`y > \frac{d}{2} \;\Rightarrow\; \text{it hits a plate}`,
      ],
    ],
  },
  millikan: {
    about: T`In 1909 Robert Millikan measured the charge of a single electron. He sprayed tiny oil drops between two horizontal metal plates and adjusted the voltage until a charged drop hung motionless, its weight exactly balanced by the electric force. Knowing the drop's mass, he could work out its charge. Every drop turned out to carry a whole-number multiple of one small charge: the charge of the electron.`,
    idea: T`A drop that hangs still has no net force on it, so the upward electric force equals its weight.`,
    origin: [
      [
        T`Gravity pulls the drop downwards with a force equal to its weight.`,
        T`F_{\text{down}} = mg`,
      ],
      [
        T`The voltage $V$ across plates a distance $d$ apart makes a uniform electric field in the gap.`,
        T`E = \frac{V}{d}`,
      ],
      [
        T`The field pushes on the drop's charge $q$ with a force $qE$. Write $\frac{V}{d}$ in place of $E$. The plates are connected the right way round to make this force point upwards.`,
        T`F_{\text{up}} = qE = \frac{qV}{d}`,
      ],
      [
        T`The voltage is adjusted until the drop neither rises nor falls. By Newton's first law, an object that stays at rest has no net force on it, so the upward force must equal the downward force.`,
        T`\frac{qV}{d} = mg`,
      ],
      [
        T`Make $q$ the subject. First multiply both sides by $d$ to remove the division.`,
        T`qV = mgd`,
      ],
      [
        T`$q$ is multiplied by $V$. Divide both sides by $V$.`,
        T`q = \frac{mgd}{V}`,
      ],
      [
        T`Millikan repeated this for many drops. The charges were always 1, 2, 3 … times the same small value and never anything in between, showing that charge comes in indivisible units.`,
        T`q = n \times 1.60 \times 10^{-19}\ \text{C} \quad (n = 1, 2, 3, \dots)`,
      ],
    ],
  },
  "projectile-range": {
    about: T`A projectile is anything thrown, kicked or fired that then moves under gravity alone. This equation gives its range: how far away it lands on level ground. The range depends on the launch speed (strongly, because it is squared), on the launch angle, and on the strength of gravity. It also shows that 45° gives the longest range, and that two angles the same amount either side of 45° (such as 30° and 60°) give equal ranges. Air resistance is ignored.`,
    idea: T`Split the motion into horizontal and vertical parts. The vertical motion decides how long the projectile is in the air; the horizontal motion decides how far it gets in that time.`,
    origin: [
      [
        T`The launch velocity $u$ points at an angle $\theta$ above the ground. Treat it as two velocities added together: one horizontal and one vertical. Drawing $u$ as the long side of a right-angled triangle, the horizontal side is next to the angle, so it is $u\cos\theta$, and the vertical side is opposite the angle, so it is $u\sin\theta$.`,
        T`u_x = u\cos\theta, \qquad u_y = u\sin\theta`,
      ],
      [
        T`Gravity pulls straight down, so it affects only the vertical motion. That is why the two directions can be handled separately. Vertically, use $s = ut + \tfrac{1}{2}at^2$ with starting velocity $u\sin\theta$ and acceleration $-g$ (minus because it is downwards and we are counting up as positive).`,
        T`y = u\sin\theta \times t - \tfrac{1}{2}gt^2`,
      ],
      [
        T`The projectile lands when its height is back to zero. Set $y = 0$ to find when that is.`,
        T`0 = u\sin\theta \times t - \tfrac{1}{2}gt^2`,
      ],
      [
        T`Both terms on the right are multiplied by $t$ (remember $t^2$ is $t \times t$). So the right side can be written as $t$ times a bracket.`,
        T`0 = t \times \left(u\sin\theta - \tfrac{1}{2}gt\right)`,
      ],
      [
        T`If two numbers multiply to give zero, one of them must be zero. So either $t = 0$, which is the moment of launch, or the bracket is zero, which must be the landing.`,
        T`u\sin\theta - \tfrac{1}{2}gt = 0`,
      ],
      [
        T`Add $\tfrac{1}{2}gt$ to both sides.`,
        T`u\sin\theta = \tfrac{1}{2}gt`,
      ],
      [
        T`Multiply both sides by 2 to remove the half, then divide both sides by $g$. This is the time of flight.`,
        T`t = \frac{2u\sin\theta}{g}`,
      ],
      [
        T`Now the horizontal motion. With no air resistance there is no horizontal force, so the horizontal velocity stays at $u\cos\theta$ throughout. Distance is speed times time.`,
        T`R = u\cos\theta \times t`,
      ],
      [
        T`The time in the air is the time of flight just found, so write it in place of $t$.`,
        T`R = u\cos\theta \times \frac{2u\sin\theta}{g}`,
      ],
      [
        T`Multiply the top lines together: $u \times u = u^2$.`,
        T`R = \frac{2u^2\sin\theta\cos\theta}{g}`,
      ],
      [
        T`Trigonometry has a standard result, the double-angle formula: $2\sin\theta\cos\theta$ is always equal to $\sin 2\theta$, the sine of twice the angle. Use it to shorten the top line.`,
        T`R = \frac{u^2\sin 2\theta}{g}`,
      ],
      [
        T`The largest value a sine can have is 1, when its angle is $90^\circ$. Here the angle is $2\theta$, so the range is greatest when $2\theta = 90^\circ$, that is, $\theta = 45^\circ$.`,
        T`R_{\text{max}} = \frac{u^2}{g} \quad \text{at } \theta = 45^\circ`,
      ],
    ],
  },
  "falling-without-friction": {
    about: T`When something falls, slides down a smooth slope or swings down on a rope, its gravitational potential energy turns into kinetic energy. If nothing is lost to friction or air resistance, this equation gives its speed after dropping through a height. Remarkably, the answer does not depend on the mass, or on the shape of the path: a ball dropped straight down and one rolling down a frictionless ramp of the same height arrive at the same speed.`,
    idea: T`Use conservation of energy: the potential energy lost equals the kinetic energy gained.`,
    origin: [
      [
        T`An object of mass $m$ that drops through a height $h$ loses gravitational potential energy $mgh$.`,
        T`\text{potential energy lost} = mgh`,
      ],
      [
        T`If it started from rest, the kinetic energy it has gained is $\tfrac{1}{2}mv^2$, where $v$ is its speed at the bottom.`,
        T`\text{kinetic energy gained} = \tfrac{1}{2}mv^2`,
      ],
      [
        T`With no friction or air resistance, no energy is turned into heat. Energy is conserved, so all the potential energy lost has become kinetic energy.`,
        T`mgh = \tfrac{1}{2}mv^2`,
      ],
      [
        T`Both sides are multiplied by $m$. Divide both sides by $m$ and it cancels. So the speed is the same for every object, whatever its mass.`,
        T`gh = \tfrac{1}{2}v^2`,
      ],
      [
        T`Multiply both sides by 2 to remove the half.`,
        T`2gh = v^2`,
      ],
      [
        T`Take the square root of both sides, and write $v$ on the left.`,
        T`v = \sqrt{2gh}`,
      ],
      [
        T`For a straight drop the same answer comes from the equation of motion $v^2 = u^2 + 2as$ with $u = 0$, $a = g$ and $s = h$. The energy method is more powerful, though, because it never asked what path the object took. It works for slopes, curves and swings alike.`,
        T`v^2 = 0^2 + 2gh`,
      ],
    ],
  },
  "block-on-ramp": {
    about: T`Put a block on a slope and gravity tries to slide it down while friction tries to hold it back. This equation gives the block's acceleration down the slope once it is sliding. Steeper slopes give more acceleration; rougher surfaces give less. If the friction is strong enough the result is negative, which means a block at rest will stay put. The mass of the block makes no difference.`,
    idea: T`Split the weight into a part along the slope and a part pressing into it. Balance the forces at right angles to the slope to find the friction, then apply Newton's second law along the slope.`,
    origin: [
      [
        T`Three forces act on the block: its weight $mg$ straight down; the normal force $N$ from the slope, at right angles to the surface; and friction $F_f$ along the surface, up the slope (opposing the sliding).`,
        T`mg, \qquad N, \qquad F_f`,
      ],
      [
        T`The block moves along the slope, so it is easiest to measure directions along the slope and at right angles to it. The weight points in neither, so treat it as two forces added together. For a slope at angle $\theta$ to the horizontal, geometry shows the angle between the weight and the line at right angles to the slope is also $\theta$. That makes the part pressing into the slope $mg\cos\theta$ and the part pulling down the slope $mg\sin\theta$.`,
        T`\text{down the slope: } mg\sin\theta, \qquad \text{into the slope: } mg\cos\theta`,
      ],
      [
        T`A check on which is which: on flat ground, $\theta = 0^\circ$, $\sin\theta = 0$ and $\cos\theta = 1$. Nothing pulls the block along and all its weight presses into the ground, as it should.`,
        T`\theta = 0^\circ: \quad mg\sin\theta = 0, \quad mg\cos\theta = mg`,
      ],
      [
        T`At right angles to the slope the block does not move: it neither sinks into the surface nor lifts off. So in that direction the forces balance, and the normal force equals the part of the weight pressing in.`,
        T`N = mg\cos\theta`,
      ],
      [
        T`Sliding friction is the coefficient of friction times the normal force. Write $mg\cos\theta$ in place of $N$.`,
        T`F_f = \mu N = \mu mg\cos\theta`,
      ],
      [
        T`Along the slope, the net force down the slope is the weight's pull down it minus the friction up it. Newton's second law says the net force equals mass times acceleration.`,
        T`ma = mg\sin\theta - \mu mg\cos\theta`,
      ],
      [
        T`Every term on both sides is multiplied by $m$. Divide both sides by $m$ and it cancels from each term. The acceleration does not depend on the mass.`,
        T`a = g\sin\theta - \mu g\cos\theta`,
      ],
      [
        T`Both terms on the right are multiplied by $g$, so the right side can be written as $g$ times a bracket.`,
        T`a = g(\sin\theta - \mu\cos\theta)`,
      ],
      [
        T`If the bracket is negative, friction is larger than the pull down the slope. That happens when $\mu\cos\theta > \sin\theta$; dividing both sides by $\cos\theta$ gives $\mu > \tan\theta$. A block at rest then stays where it is, and one already sliding slows down.`,
        T`\mu > \tan\theta \;\Rightarrow\; \text{does not start to slide}`,
      ],
    ],
  },
  "banked-curve": {
    about: T`Roads and racetracks are often tilted on bends, with the outside edge higher than the inside. This banking lets the road itself push a vehicle towards the centre of the curve, so that less (or no) sideways grip from the tyres is needed. For each speed and radius there is one ideal angle at which a car would get round even on ice. This equation finds it. The same idea explains why aeroplanes and cyclists lean into a turn.`,
    idea: T`With no friction, only two forces act: weight and the normal force. The vertical part of the normal force balances the weight; its horizontal part provides the centripetal force. Dividing one equation by the other removes the unknown normal force.`,
    origin: [
      [
        T`Suppose there is no friction at all. Then only two forces act on the car: its weight $mg$ straight down, and the normal force $N$ from the road, at right angles to the road surface.`,
        T`mg \text{ (down)}, \qquad N \text{ (at right angles to the road)}`,
      ],
      [
        T`The road is tilted at the banking angle $\theta$, so the normal force is tilted by $\theta$ away from vertical. Treat it as two forces added together. Drawing $N$ as the long side of a right-angled triangle, the vertical side is next to the angle $\theta$, so it is $N\cos\theta$; the horizontal side is opposite, so it is $N\sin\theta$, pointing towards the centre of the bend.`,
        T`\text{vertical: } N\cos\theta, \qquad \text{horizontal: } N\sin\theta`,
      ],
      [
        T`The car stays at the same height: it does not accelerate up or down. So the vertical forces balance.`,
        T`N\cos\theta = mg`,
      ],
      [
        T`The car is moving in a horizontal circle of radius $r$ at speed $v$, so it needs a net horizontal force of $\frac{mv^2}{r}$ towards the centre. The only horizontal force is the horizontal part of $N$.`,
        T`N\sin\theta = \frac{mv^2}{r}`,
      ],
      [
        T`We do not know $N$, but it is in both equations. Divide the second equation by the first (left side by left side, right side by right side) and it will cancel.`,
        T`\frac{N\sin\theta}{N\cos\theta} = \frac{mv^2}{r} \div mg`,
      ],
      [
        T`On the left, the $N$ cancels, and $\frac{\sin\theta}{\cos\theta}$ is the definition of $\tan\theta$.`,
        T`\tan\theta = \frac{mv^2}{r} \div mg`,
      ],
      [
        T`On the right, dividing by $mg$ puts $mg$ on the bottom line.`,
        T`\tan\theta = \frac{mv^2}{rmg}`,
      ],
      [
        T`There is an $m$ on the top and on the bottom. They cancel.`,
        T`\tan\theta = \frac{v^2}{rg}`,
      ],
      [
        T`The mass has gone, so the same banking suits a lorry and a motorbike. But the angle is right for only one speed: go faster and the car needs friction to stop it sliding up the bank; go slower and it needs friction to stop it sliding down.`,
        T`\theta = \arctan\!\left(\frac{v^2}{rg}\right)`,
      ],
    ],
  },
  "conical-pendulum": {
    about: T`Whirl a ball on a string so that it goes round in a horizontal circle below your hand: the string sweeps out a cone, which gives the conical pendulum its name. The faster the ball goes round, the more the string swings outwards. This equation gives the time for one circuit from the length of the string and its angle to the vertical. Chair-swing fairground rides work the same way.`,
    idea: T`Two forces act: weight and tension. The vertical part of the tension balances the weight; the horizontal part is the centripetal force. Combine the two to remove the tension.`,
    origin: [
      [
        T`Two forces act on the ball: its weight $mg$ straight down, and the tension $F_T$ pulling along the string towards the support. The string makes an angle $\theta$ with the vertical.`,
        T`mg \text{ (down)}, \qquad F_T \text{ (along the string)}`,
      ],
      [
        T`Treat the tension as two forces added together. Drawing $F_T$ as the long side of a right-angled triangle, the vertical side is next to the angle $\theta$, so it is $F_T\cos\theta$; the horizontal side is opposite, so it is $F_T\sin\theta$, pointing towards the centre of the circle.`,
        T`\text{vertical: } F_T\cos\theta, \qquad \text{horizontal: } F_T\sin\theta`,
      ],
      [
        T`The ball stays at the same height, so the vertical forces balance.`,
        T`F_T\cos\theta = mg`,
      ],
      [
        T`The ball goes round a horizontal circle. Its radius $r$ is the horizontal distance from the ball to the point directly below the support. In the triangle made by the string (length $L$), that distance is the side opposite $\theta$.`,
        T`r = L\sin\theta`,
      ],
      [
        T`The centripetal force needed is $\frac{mv^2}{r}$. The ball covers one circumference in one period, so $v = \frac{2\pi r}{T}$ and $v^2 = \frac{4\pi^2r^2}{T^2}$. Putting that in, one $r$ cancels.`,
        T`\frac{mv^2}{r} = \frac{m}{r} \times \frac{4\pi^2 r^2}{T^2} = \frac{4\pi^2 mr}{T^2}`,
      ],
      [
        T`The only horizontal force is the horizontal part of the tension, so it must be this centripetal force. Also write $L\sin\theta$ in place of $r$.`,
        T`F_T\sin\theta = \frac{4\pi^2 m\,L\sin\theta}{T^2}`,
      ],
      [
        T`Both sides are multiplied by $\sin\theta$. Divide both sides by it and it cancels.`,
        T`F_T = \frac{4\pi^2 mL}{T^2}`,
      ],
      [
        T`Now there is an expression for the tension. Write it in place of $F_T$ in the vertical equation, $F_T\cos\theta = mg$.`,
        T`\frac{4\pi^2 mL}{T^2} \times \cos\theta = mg`,
      ],
      [
        T`Both sides are multiplied by $m$. Divide both sides by $m$ and it cancels: the period does not depend on the mass.`,
        T`\frac{4\pi^2 L\cos\theta}{T^2} = g`,
      ],
      [
        T`Multiply both sides by $T^2$ to bring it off the bottom.`,
        T`4\pi^2 L\cos\theta = gT^2`,
      ],
      [
        T`$T^2$ is multiplied by $g$. Divide both sides by $g$, and write $T^2$ on the left.`,
        T`T^2 = \frac{4\pi^2 L\cos\theta}{g}`,
      ],
      [
        T`Take the square root of both sides. The square root of $4\pi^2$ is $2\pi$, which can be written outside the root.`,
        T`T = 2\pi\sqrt{\frac{L\cos\theta}{g}}`,
      ],
      [
        T`$L\cos\theta$ is the vertical height of the support above the circle. So the period depends only on that height: swing faster, the ball rises, the height shrinks and the period gets shorter.`,
        T`L\cos\theta = \text{height of the support above the circle}`,
      ],
    ],
  },
  "vertical-circle": {
    about: T`Swing a bucket of water over your head fast enough and the water stays in. Go too slowly and you get wet. This equation gives the least speed an object needs at the top of a vertical circle to stay on the circle, whether it is water in a bucket, a ball on a string or a car on a loop-the-loop. It depends only on the radius and on gravity, not on the mass.`,
    idea: T`At the top, the weight and the pull of whatever holds the object on the circle (the tension in a string, or the reaction force from a bucket or track) both point towards the centre. The slowest possible speed is the one where that force has dropped to zero and weight alone provides the centripetal force.`,
    origin: [
      [
        T`Think about an object at the very top of a vertical circle: a ball on a string, water in a bucket, or a car on a loop-the-loop. The centre of the circle is directly below it. Its weight $mg$ points down, towards the centre. The other force on it is $F$: the tension in the string, or the reaction force of the bucket or track. A string can only pull, and a bucket or track can only push the object away from itself, so at the top this force also points towards the centre. Both forces point the same way and add.`,
        T`F_{\text{net}} = F + mg \quad \text{(towards the centre)}`,
      ],
      [
        T`To move in a circle of radius $r$ at speed $v$, the object needs a net force towards the centre of $\frac{mv^2}{r}$. The net force available is the one in the line above, so set them equal.`,
        T`F + mg = \frac{mv^2}{r}`,
      ],
      [
        T`Subtract $mg$ from both sides to see what tension or reaction force is needed at a given speed.`,
        T`F = \frac{mv^2}{r} - mg`,
      ],
      [
        T`Go slower and the first term shrinks, so the force needed gets smaller. But a string cannot push and a track cannot pull, so this force can never be less than zero. The slowest speed that works is therefore the one at which it is exactly zero.`,
        T`0 = \frac{mv^2}{r} - mg`,
      ],
      [
        T`Add $mg$ to both sides. This says that at the least speed, the weight alone is exactly the centripetal force.`,
        T`mg = \frac{mv^2}{r}`,
      ],
      [
        T`Both sides are multiplied by $m$. Divide both sides by $m$ and it cancels.`,
        T`g = \frac{v^2}{r}`,
      ],
      [
        T`Multiply both sides by $r$ to remove the division.`,
        T`gr = v^2`,
      ],
      [
        T`Take the square root of both sides, and write $v$ on the left.`,
        T`v_{\text{min}} = \sqrt{gr}`,
      ],
      [
        T`Below this speed, gravity is more than is needed to keep the object on the circle. It curves more tightly than the circle: the string goes slack, or the object leaves the track (or the water leaves the bucket), and it falls inside the circle.`,
        T`v < \sqrt{gr} \;\Rightarrow\; \text{it leaves the circle}`,
      ],
    ],
  },
  "mass-on-spring": {
    about: T`A mass hanging on a spring, pulled down and let go, bobs up and down with a regular rhythm. This equation gives the period: the time for one complete bounce. A heavier mass bounces more slowly, and a stiffer spring makes it bounce faster. Surprisingly, how far you pull it down makes no difference to the timing. The same mathematics describes car suspension, vibrating molecules and the balance wheel of a watch.`,
    idea: T`The spring's force always pulls the mass back towards its rest position, in proportion to how far away it is. Motion like that is called simple harmonic motion, and it has a known period.`,
    origin: [
      [
        T`Let $x$ be how far the mass is from its rest position. By Hooke's law the spring pulls it back with a force of size $kx$. The force is always directed back towards the rest position, opposite to the displacement, and a minus sign is used to show that.`,
        T`F = -kx`,
      ],
      [
        T`Newton's second law says $F = ma$. Both expressions are the net force on the mass, so set them equal.`,
        T`ma = -kx`,
      ],
      [
        T`Divide both sides by $m$ to get the acceleration.`,
        T`a = -\frac{k}{m}\,x`,
      ],
      [
        T`This says the acceleration is proportional to the displacement and always points back towards the middle. Any motion with that property is called simple harmonic motion. Such motion is always written in a standard form, using a quantity $\omega$ (omega) called the angular frequency.`,
        T`a = -\omega^2 x`,
      ],
      [
        T`Compare the two lines. They have the same shape, and they are describing the same acceleration, so the things multiplying $x$ must be equal.`,
        T`\omega^2 = \frac{k}{m}`,
      ],
      [
        T`Take the square root of both sides.`,
        T`\omega = \sqrt{\frac{k}{m}}`,
      ],
      [
        T`For simple harmonic motion the period is $2\pi$ divided by $\omega$. (This result comes from the mathematics of sine waves, where one full cycle corresponds to an angle of $2\pi$ radians; we take it on trust.)`,
        T`T = \frac{2\pi}{\omega}`,
      ],
      [
        T`Write $\sqrt{\frac{k}{m}}$ in place of $\omega$.`,
        T`T = 2\pi \div \sqrt{\frac{k}{m}}`,
      ],
      [
        T`Dividing by a fraction is the same as multiplying by it turned upside down, and that works under a square root too: dividing by $\sqrt{\frac{k}{m}}$ is multiplying by $\sqrt{\frac{m}{k}}$.`,
        T`T = 2\pi\sqrt{\frac{m}{k}}`,
      ],
      [
        T`The size of the bounce, the amplitude, appears nowhere. A bigger bounce means further to go, but also a bigger force and so more speed, and the two effects cancel exactly.`,
        T`T \text{ does not depend on the amplitude}`,
      ],
    ],
  },
  "simple-pendulum": {
    about: T`A simple pendulum is a small weight swinging on a light string. For centuries it was the most accurate timekeeper available, because of a remarkable property: its period (the time for one swing there and back) depends only on its length and on gravity. The mass of the bob does not matter, and nor, for small swings, does the size of the swing. A longer pendulum swings more slowly.`,
    idea: T`For small swings, the force pulling the bob back is proportional to how far it is from the middle. That makes the motion simple harmonic, like a mass on a spring, with a known period.`,
    origin: [
      [
        T`When the string is at an angle $\theta$ from the vertical, the bob's weight $mg$ can be treated as two forces: one along the string, which the tension balances, and one along the bob's curved path, of size $mg\sin\theta$, which pulls it back towards the middle. A minus sign shows that it points back, opposite to the displacement.`,
        T`F = -mg\sin\theta`,
      ],
      [
        T`For small angles measured in radians, $\sin\theta$ is very nearly equal to $\theta$ itself. For example, $10^\circ$ is 0.1745 rad and $\sin 10^\circ = 0.1736$, a difference of half a per cent. Making this replacement is called the small-angle approximation.`,
        T`\sin\theta \approx \theta \quad \text{(small angles, in radians)}`,
      ],
      [
        T`Write $\theta$ in place of $\sin\theta$. The sign $\approx$ means "is approximately equal to".`,
        T`F \approx -mg\theta`,
      ],
      [
        T`An angle in radians is defined as arc length divided by radius. The bob is a distance $x$ along its arc from the middle, and the radius of the arc is the length of the string, $L$.`,
        T`\theta = \frac{x}{L}`,
      ],
      [
        T`Write $\frac{x}{L}$ in place of $\theta$.`,
        T`F \approx -\frac{mg}{L}\,x`,
      ],
      [
        T`Newton's second law says $F = ma$, so set $ma$ equal to this force.`,
        T`ma = -\frac{mg}{L}\,x`,
      ],
      [
        T`Both sides are multiplied by $m$. Divide both sides by $m$ and it cancels. This is why the mass of the bob does not affect the period.`,
        T`a = -\frac{g}{L}\,x`,
      ],
      [
        T`The acceleration is proportional to the displacement and points back towards the middle. That is simple harmonic motion, whose standard form is $a = -\omega^2x$. Comparing the two, the things multiplying $x$ must be equal.`,
        T`\omega^2 = \frac{g}{L}`,
      ],
      [
        T`Take the square root of both sides.`,
        T`\omega = \sqrt{\frac{g}{L}}`,
      ],
      [
        T`The period of simple harmonic motion is $2\pi$ divided by $\omega$ (a result from the mathematics of sine waves). Dividing by $\sqrt{\frac{g}{L}}$ is the same as multiplying by $\sqrt{\frac{L}{g}}$.`,
        T`T = \frac{2\pi}{\omega} = 2\pi\sqrt{\frac{L}{g}}`,
      ],
      [
        T`Because of the small-angle step, this is accurate only for small swings. At $20^\circ$ the true period is about 0.8% longer than the equation gives, and the error grows quickly beyond that.`,
        T`T = 2\pi\sqrt{\frac{L}{g}} \quad \text{(small swings)}`,
      ],
    ],
  },
  "collisions-1d": {
    about: T`When two objects collide head-on, how fast does each move afterwards? Two rules decide it. First, the total momentum is the same after as before, always. Second, the "bounciness" of the collision, measured by the coefficient of restitution $e$, sets how fast they separate compared with how fast they came together. With $e = 1$ the collision is perfectly elastic and no kinetic energy is lost; with $e = 0$ the objects stick together. This equation combines the two rules to give the first object's final velocity.`,
    idea: T`Write down the two rules as two equations. They contain two unknowns (the two final velocities). Use one equation to get rid of one unknown, then solve for the other.`,
    origin: [
      [
        T`During the collision the two balls push on each other with equal and opposite forces (Newton's third law) for the same time, so whatever momentum one gains the other loses. With no outside force along the line, the total momentum before equals the total momentum after.`,
        T`m_1u_1 + m_2u_2 = m_1v_1 + m_2v_2`,
      ],
      [
        T`The coefficient of restitution $e$ is defined as the speed at which the balls separate divided by the speed at which they approached. The first ball is behind the second, so they approach at $u_1 - u_2$ and separate at $v_2 - v_1$. Multiplying both sides of that definition by $(u_1 - u_2)$ gives:`,
        T`v_2 - v_1 = e(u_1 - u_2)`,
      ],
      [
        T`We want $v_1$, so we need to get rid of $v_2$. In the second equation, add $v_1$ to both sides to get $v_2$ by itself.`,
        T`v_2 = v_1 + e(u_1 - u_2)`,
      ],
      [
        T`Now write this expression in place of $v_2$ in the momentum equation. It needs brackets round it because the whole thing is multiplied by $m_2$.`,
        T`m_1u_1 + m_2u_2 = m_1v_1 + m_2\big(v_1 + e(u_1 - u_2)\big)`,
      ],
      [
        T`Multiply out the brackets: $m_2$ multiplies $v_1$, and $m_2e$ multiplies $u_1$ and $-u_2$.`,
        T`m_1u_1 + m_2u_2 = m_1v_1 + m_2v_1 + em_2u_1 - em_2u_2`,
      ],
      [
        T`Gather everything containing $v_1$ on the right and everything else on the left. To move $em_2u_1$, subtract it from both sides; to move $-em_2u_2$, add $em_2u_2$ to both sides.`,
        T`m_1u_1 - em_2u_1 + m_2u_2 + em_2u_2 = m_1v_1 + m_2v_1`,
      ],
      [
        T`On the left, the first two terms are both multiplied by $u_1$, so write them as a bracket times $u_1$.`,
        T`(m_1 - em_2)u_1 + m_2u_2 + em_2u_2 = m_1v_1 + m_2v_1`,
      ],
      [
        T`The next two terms are both multiplied by $m_2u_2$: one lot plus $e$ lots is $(1 + e)$ lots.`,
        T`(m_1 - em_2)u_1 + (1 + e)m_2u_2 = m_1v_1 + m_2v_1`,
      ],
      [
        T`On the right, both terms are multiplied by $v_1$, so write them as a bracket times $v_1$.`,
        T`(m_1 - em_2)u_1 + (1 + e)m_2u_2 = (m_1 + m_2)v_1`,
      ],
      [
        T`$v_1$ is multiplied by $(m_1 + m_2)$. Divide both sides by that, and write $v_1$ on the left.`,
        T`v_1 = \frac{(m_1 - em_2)u_1 + (1 + e)m_2u_2}{m_1 + m_2}`,
      ],
      [
        T`The second ball's velocity can be found the same way, or more quickly from the third step now that $v_1$ is known.`,
        T`v_2 = v_1 + e(u_1 - u_2)`,
      ],
    ],
  },
  "power-lines": {
    about: T`Electricity is carried across the country at hundreds of thousands of volts, far more than any home could use. This equation shows why. Cables have resistance, so some power is wasted heating them. That waste depends on the square of the current, and for a given power, a higher voltage means a smaller current. Raising the voltage tenfold cuts the waste a hundredfold.`,
    idea: T`Find the current needed to deliver the power at the chosen voltage, then find the heating that current causes in the cable's resistance.`,
    origin: [
      [
        T`A power station sends out power $P$ at a voltage $V$. Electrical power is voltage times current.`,
        T`P = VI`,
      ],
      [
        T`We want the current in the cable. $I$ is multiplied by $V$, so divide both sides by $V$.`,
        T`I = \frac{P}{V}`,
      ],
      [
        T`This current flows through the cable, which has resistance $R$. The power turned into heat in a resistance is the current squared times the resistance (see "Power used or lost in a resistive component").`,
        T`P_{\text{loss}} = I^2R`,
      ],
      [
        T`The current here is the one found in the second step, so write $\frac{P}{V}$ in place of $I$. The whole fraction is squared.`,
        T`P_{\text{loss}} = \left(\frac{P}{V}\right)^2 R`,
      ],
      [
        T`Squaring a fraction squares its top and its bottom.`,
        T`P_{\text{loss}} = \frac{P^2R}{V^2}`,
      ],
      [
        T`$V^2$ is on the bottom. Send the same power at ten times the voltage and the bottom becomes $(10V)^2 = 100V^2$: the loss is a hundred times smaller.`,
        T`\frac{P^2R}{(10V)^2} = \frac{1}{100} \times \frac{P^2R}{V^2}`,
      ],
      [
        T`A warning about a common mistake: $V$ here is the voltage at which the power is sent, not the voltage drop along the cable. That is why $P = \frac{V^2}{R}$ must not be used for the loss with this $V$.`,
        T`V = \text{transmission voltage (not the drop along the cable)}`,
      ],
      [
        T`Transformers make this practical: a step-up transformer raises the voltage for the journey, and step-down transformers lower it again to a safe level for homes.`,
        T`\frac{V_p}{V_s} = \frac{N_p}{N_s}`,
      ],
    ],
  },
  "ac-generator": {
    about: T`Almost all the world's electricity is made by spinning coils of wire in magnetic fields (or magnets inside coils). As the coil turns, the magnetic flux through it rises and falls, and by Faraday's law that changing flux produces a voltage. The voltage swings smoothly one way and then the other, which is what alternating current (a.c.) means. This equation gives the peak value of that voltage.`,
    idea: T`Write the flux through the turning coil as a function of time, then apply Faraday's law. The step that finds how fast the flux changes uses a result from calculus, which is explained but not proved.`,
    origin: [
      [
        T`A coil of area $A$ sits in a magnetic field $B$. The flux through each turn is $BA\cos\theta$, where $\theta$ is the angle between the field and the coil's normal (the line at right angles to its face).`,
        T`\Phi = BA\cos\theta`,
      ],
      [
        T`The coil turns steadily. Its angular speed $\omega$ (omega) is the angle it turns through each second, in radians. After $t$ seconds it has turned through $\omega$ times $t$.`,
        T`\theta = \omega t`,
      ],
      [
        T`Write $\omega t$ in place of $\theta$. The flux now rises and falls as a cosine wave as time passes.`,
        T`\Phi = BA\cos\omega t`,
      ],
      [
        T`Faraday's law says the e.m.f. in a coil of $N$ turns is $-N$ times the rate at which the flux through each turn is changing.`,
        T`\varepsilon = -N\,\frac{\Delta\Phi}{\Delta t}`,
      ],
      [
        T`How fast does $\cos\omega t$ change? Picture the cosine curve: it is momentarily flat at its peaks (changing slowly) and steepest where it crosses zero. The sine curve is the other way round: zero where cosine peaks, largest where cosine crosses zero. Calculus confirms that the rate of change of $\cos\omega t$ is $-\omega\sin\omega t$. The $\omega$ appears because a faster-turning coil changes its flux faster. We take this on trust.`,
        T`\frac{\Delta\Phi}{\Delta t} = -BA\omega\sin\omega t`,
      ],
      [
        T`Write that in place of $\frac{\Delta\Phi}{\Delta t}$ in Faraday's law.`,
        T`\varepsilon = -N \times (-BA\omega\sin\omega t)`,
      ],
      [
        T`A minus times a minus is a plus.`,
        T`\varepsilon = NBA\omega\sin\omega t`,
      ],
      [
        T`The sine swings between $-1$ and $+1$, so the e.m.f. swings between $-NBA\omega$ and $+NBA\omega$. Its largest value, the peak e.m.f., is when $\sin\omega t = 1$.`,
        T`\varepsilon_0 = NBA\omega`,
      ],
      [
        T`The peak comes when the flux through the coil is zero (the coil edge-on to the field), because that is when the flux is changing fastest. Spinning the coil faster raises both the peak voltage and the frequency, since $\omega = 2\pi f$.`,
        T`\varepsilon_0 = 2\pi f\,NBA`,
      ],
    ],
  },
  "photoelectric-stopping-voltage": {
    about: T`In a photoelectric experiment, light knocks electrons out of a metal plate and they fly across to a collector. If the collector is made negative, it repels the electrons and slows them. The stopping voltage is the voltage that is just enough to turn back even the fastest ones, so that the current drops to zero. Measuring it is the standard way to find the electrons' maximum kinetic energy, and from that the Planck constant.`,
    idea: T`The stopping voltage removes exactly all of the fastest electrons' kinetic energy. Set the energy removed equal to the kinetic energy given by Einstein's photoelectric equation.`,
    origin: [
      [
        T`The fastest electrons leave the metal with the kinetic energy given by Einstein's photoelectric equation: the photon's energy minus the work function.`,
        T`E_k = hf - W`,
      ],
      [
        T`The collector is made negative, so it repels the (negative) electrons: they are climbing an electrical "hill". Moving a charge through a potential difference $V$ transfers energy $qV$. For an electron the size of the charge is $e$, so an electron that climbs through $V$ loses kinetic energy $eV$.`,
        T`\text{kinetic energy lost} = eV`,
      ],
      [
        T`The stopping voltage $V_s$ is defined as the one that only just stops the fastest electrons. "Only just stops" means it takes away all of their kinetic energy and no more.`,
        T`eV_s = E_k`,
      ],
      [
        T`From the first step, $E_k$ equals $hf - W$. Write that in its place.`,
        T`eV_s = hf - W`,
      ],
      [
        T`$V_s$ is multiplied by $e$. Divide both sides by $e$.`,
        T`V_s = \frac{hf - W}{e}`,
      ],
      [
        T`Dividing each term on top by $e$ separately shows what a graph would look like. Plot $V_s$ against $f$ and you get a straight line: its gradient is $\frac{h}{e}$ and it is the same for every metal. That is how Millikan measured the Planck constant.`,
        T`V_s = \frac{h}{e}\,f - \frac{W}{e}`,
      ],
      [
        T`If $hf$ is less than $W$ the equation gives a negative stopping voltage. That has no physical meaning: it is the equation's way of saying that no electrons are emitted, so there is nothing to stop.`,
        T`hf < W \;\Rightarrow\; \text{no electrons emitted}`,
      ],
    ],
  },
};
