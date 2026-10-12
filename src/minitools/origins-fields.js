// "What it is about" and "Where it comes from" for the minitools on circular
// motion, gravitation, electricity and magnetism. No DOM. The conventions are
// described at the top of origins-mechanics.js.

const T = String.raw;

export const fields = {
  "circular-speed": {
    about: T`An object moving round a circle at a steady rate covers one circumference in each lap. This equation turns the size of the circle and the time for one lap (the period) into a speed. It applies to anything going round steadily: a child on a roundabout, a point on a spinning wheel, a satellite in a circular orbit.`,
    idea: T`Speed is distance divided by time. For one lap, the distance is the circumference and the time is the period.`,
    origin: [
      [
        T`Speed is the distance travelled divided by the time taken.`,
        T`v = \frac{\text{distance}}{\text{time}}`,
      ],
      [
        T`Choose exactly one lap as the journey, because we know both its distance and its time. The distance round a circle of radius $r$ is its circumference, which geometry gives as $2\pi r$.`,
        T`\text{distance for one lap} = 2\pi r`,
      ],
      [
        T`The time for one lap has a name, the period, and the symbol $T$.`,
        T`\text{time for one lap} = T`,
      ],
      [
        T`Write these two in place of "distance" and "time" in the first line.`,
        T`v = \frac{2\pi r}{T}`,
      ],
      [
        T`Check it makes sense: a bigger circle in the same time means a higher speed (more distance), and a longer period for the same circle means a lower speed.`,
        T`v = \frac{2\pi r}{T}`,
      ],
    ],
  },
  "centripetal-acceleration": {
    about: T`Something moving in a circle is accelerating even when its speed never changes. That sounds odd until you remember that velocity includes direction: on a circle the direction changes all the time, and any change in velocity is an acceleration. This acceleration always points towards the centre of the circle ("centripetal" means centre-seeking). It grows quickly with speed and is larger on tighter circles.`,
    idea: T`Look at how the velocity arrow changes during a very short time, and divide that change by the time.`,
    origin: [
      [
        T`Acceleration is the change in velocity divided by the time the change takes. Velocity is an arrow with a size and a direction; on a circle at steady speed the arrow keeps its length $v$ but swings round.`,
        T`a = \frac{\Delta v}{\Delta t}`,
      ],
      [
        T`In a very short time $\Delta t$ the object moves a short distance along the circle. Distance is speed times time.`,
        T`\text{distance along the circle} = v\,\Delta t`,
      ],
      [
        T`Angles can be measured in radians: the angle is the distance along the arc divided by the radius. So during $\Delta t$ the object moves through this angle, as seen from the centre:`,
        T`\Delta\theta = \frac{v\,\Delta t}{r}`,
      ],
      [
        T`The velocity is always at right angles to the radius. So when the radius line swings through the angle $\Delta\theta$, the velocity arrow swings through exactly the same angle.`,
        T`\text{velocity arrow turns through } \Delta\theta`,
      ],
      [
        T`Draw the old and new velocity arrows from the same point. Both have length $v$, with the small angle $\Delta\theta$ between them, so their tips lie on a circle of radius $v$. The change in velocity is the short gap between the tips, and for a small angle that gap is an arc: radius times angle.`,
        T`\Delta v = v \times \Delta\theta`,
      ],
      [
        T`We found $\Delta\theta = \frac{v\,\Delta t}{r}$ two steps ago. Write that in place of $\Delta\theta$.`,
        T`\Delta v = v \times \frac{v\,\Delta t}{r}`,
      ],
      [
        T`Multiply the two $v$'s together: $v \times v = v^2$.`,
        T`\Delta v = \frac{v^2\,\Delta t}{r}`,
      ],
      [
        T`Acceleration is $\Delta v$ divided by $\Delta t$, so divide both sides by $\Delta t$. On the right it cancels.`,
        T`a = \frac{v^2}{r}`,
      ],
      [
        T`The gap between the two arrow tips points sideways to the velocity, towards the centre of the circle. So that is the direction of the acceleration.`,
        T`a = \frac{v^2}{r} \quad \text{(towards the centre)}`,
      ],
    ],
  },
  "centripetal-force": {
    about: T`To keep an object moving in a circle, something must keep pulling it towards the centre; otherwise it would carry on in a straight line. This equation gives the size of the net inward force needed. It is not a new kind of force: it is always supplied by something real, such as the tension in a string, friction between tyres and road, or gravity on a satellite. If that force is too small for the speed, the object cannot stay on the circle.`,
    idea: T`Newton's second law says force is mass times acceleration, and we know the acceleration of circular motion.`,
    origin: [
      [
        T`Newton's second law says that any accelerating object must have a net force on it, equal to its mass times its acceleration.`,
        T`F = ma`,
      ],
      [
        T`An object moving at speed $v$ round a circle of radius $r$ is accelerating towards the centre (see "Centripetal acceleration").`,
        T`a = \frac{v^2}{r}`,
      ],
      [
        T`Both expressions describe the same acceleration, so write $\frac{v^2}{r}$ in place of $a$ in Newton's second law.`,
        T`F = m \times \frac{v^2}{r}`,
      ],
      [
        T`Multiplying a fraction by $m$ puts the $m$ on the top line.`,
        T`F = \frac{mv^2}{r}`,
      ],
      [
        T`The force points the same way as the acceleration: towards the centre. When you draw the forces on an object in circular motion, do not add an extra arrow labelled "centripetal force". Instead, work out which real forces add up to give this net inward force.`,
        T`F_{net} = \frac{mv^2}{r} \quad \text{(towards the centre)}`,
      ],
      [
        T`Because the speed is squared, taking a bend twice as fast needs four times the inward force, which is why tyres lose grip so suddenly.`,
        T`\frac{m(2v)^2}{r} = 4 \times \frac{mv^2}{r}`,
      ],
    ],
  },
  "newtons-gravitation": {
    about: T`Newton's law of gravitation says that every object with mass pulls on every other object with mass. The pull is stronger for bigger masses and weaker for objects that are further apart. It is this one force that makes an apple fall, holds the Moon in orbit and keeps the planets going round the Sun. The force acts equally on both objects: the Earth pulls on you exactly as hard as you pull on the Earth.`,
    idea: T`The law was proposed by Newton to fit observations of falling objects and of the Moon and planets. It is a statement of how nature behaves, not something derived.`,
    origin: [
      [
        T`The pull of gravity on an object is proportional to its mass: two kilograms weigh twice as much as one. (The sign $\propto$ means "is proportional to": doubling one doubles the other.)`,
        T`F \propto m`,
      ],
      [
        T`Forces come in pairs: if the planet pulls on the object, the object pulls back on the planet equally hard. For that to be fair to both, the force must depend on the planet's mass $M$ in the same way. So it is proportional to both masses, which means to their product.`,
        T`F \propto Mm`,
      ],
      [
        T`Newton compared how fast the Moon "falls" towards the Earth with how fast an apple falls. The Moon is 60 times further from the Earth's centre, and its acceleration is $60^2 = 3600$ times smaller. So the force weakens as the square of the distance: twice as far, a quarter of the force.`,
        T`F \propto \frac{1}{r^2}`,
      ],
      [
        T`Both statements are true together, so the force is proportional to the product of the masses divided by the square of the distance.`,
        T`F \propto \frac{Mm}{r^2}`,
      ],
      [
        T`A proportion becomes an equation when multiplied by a fixed number. Here it is the gravitational constant $G$, which is the same everywhere in the universe. It is found by measuring the tiny force between known masses in a laboratory.`,
        T`F = \frac{GMm}{r^2}`,
      ],
      [
        T`$r$ is the distance between the centres of the two objects, not between their surfaces. For a satellite, that is the planet's radius plus the satellite's height above the ground.`,
        T`r = \text{radius of the planet} + \text{height above it}`,
      ],
    ],
  },
  "gravitational-field-strength": {
    about: T`Gravitational field strength, $g$, is the force of gravity on each kilogram at a particular place. On the Earth's surface it is about 9.81 N/kg. This equation shows where that number comes from: it depends only on the mass of the planet and how far you are from its centre. It lets you work out $g$ on other planets, or at the height of a satellite.`,
    idea: T`Field strength is force divided by mass. Take the force from Newton's law of gravitation and divide by the mass it acts on.`,
    origin: [
      [
        T`Gravitational field strength is defined as the gravitational force on each kilogram. Put a mass $m$ at the point, measure the force $F$ on it, and share the force among the kilograms.`,
        T`g = \frac{F}{m}`,
      ],
      [
        T`Newton's law of gravitation gives that force, for a mass $m$ at a distance $r$ from the centre of a body of mass $M$.`,
        T`F = \frac{GMm}{r^2}`,
      ],
      [
        T`The two expressions describe the same force, so write the second in place of $F$ in the first line. Dividing by $m$ is the same as multiplying by $\frac{1}{m}$.`,
        T`g = \frac{GMm}{r^2} \times \frac{1}{m}`,
      ],
      [
        T`There is now an $m$ on the top line and an $m$ on the bottom. Anything divided by itself is 1, so they cancel.`,
        T`g = \frac{GM}{r^2}`,
      ],
      [
        T`The small mass $m$ has gone. So $g$ is a property of the place, not of the object put there: it depends only on the body making the field and the distance from its centre. This is why all objects fall with the same acceleration.`,
        T`g = \frac{GM}{r^2}`,
      ],
      [
        T`Check with the Earth: $M = 5.97 \times 10^{24}$ kg and $r = 6.37 \times 10^{6}$ m at the surface give 9.8 N/kg.`,
        T`g = \frac{6.67 \times 10^{-11} \times 5.97 \times 10^{24}}{(6.37 \times 10^{6})^2} = 9.8\ \text{N/kg}`,
      ],
    ],
  },
  "gravitational-potential": {
    about: T`Near the ground, potential energy is $mgh$. That stops working for rockets and satellites, because gravity gets weaker with distance. This equation is the version that works at any distance from a planet or star. It has two features that surprise people at first: it is zero when the objects are infinitely far apart, and it is negative everywhere else. Negative simply means "less than at infinity": you would have to supply energy to pull the objects apart.`,
    idea: T`Choose zero at infinity, then find how much energy gravity gives out as the object falls in from there.`,
    origin: [
      [
        T`Only changes in potential energy can be measured, so we may choose where to call it zero. Near the ground we choose floor level. For planets, the natural choice is the place where gravity has faded to nothing: infinitely far away.`,
        T`E_p = 0 \quad \text{when } r \text{ is infinitely large}`,
      ],
      [
        T`Let an object fall in from far away. Gravity pulls it inward and speeds it up, so gravity is doing work on it and its kinetic energy rises. That energy comes out of the potential energy store, so the store must go down. Starting from zero and going down means it becomes negative.`,
        T`E_p < 0 \quad \text{closer in}`,
      ],
      [
        T`How much has come out? Work is force times distance, but here the force $\frac{GMm}{r^2}$ is tiny far away and grows all the way in, so we cannot just multiply. The total has to be added up in many small steps. That sum needs calculus (integration), which is beyond this course, so we take its result on trust:`,
        T`\text{work done by gravity from far away to } r = \frac{GMm}{r}`,
      ],
      [
        T`The result is at least believable: it is the force $\frac{GMm}{r^2}$ multiplied by one distance $r$, which has the right units for work, and it is larger when the object ends up closer.`,
        T`\frac{GMm}{r^2} \times r = \frac{GMm}{r}`,
      ],
      [
        T`The potential energy started at zero and has gone down by that amount.`,
        T`E_p = 0 - \frac{GMm}{r}`,
      ],
      [
        T`Subtracting from zero just leaves the minus sign.`,
        T`E_p = -\frac{GMm}{r}`,
      ],
      [
        T`Check the direction: move further out (bigger $r$) and the fraction gets smaller, so $E_p$ is a smaller negative number, which is higher. Potential energy rises as you climb away, as it should.`,
        T`-\frac{GMm}{2r} > -\frac{GMm}{r}`,
      ],
    ],
  },
  "coulombs-law": {
    about: T`Coulomb's law gives the force between two electric charges. It has the same shape as Newton's law of gravitation, with charge in place of mass, but with one important difference: there are two kinds of charge. Like charges (both positive or both negative) push each other apart, and unlike charges pull together. The electric force is enormously stronger than gravity, which is why a rubbed balloon can lift paper against the pull of the whole Earth.`,
    idea: T`This is an experimental law, found by measuring the force between charged spheres.`,
    origin: [
      [
        T`In the 1780s Charles Coulomb measured the tiny forces between charged metal spheres using a twisting fibre. Halving the charge on one sphere halved the force: the force is proportional to that charge. (The sign $\propto$ means "is proportional to".)`,
        T`F \propto q_1`,
      ],
      [
        T`The same was true for the other sphere. Being proportional to each charge means being proportional to their product.`,
        T`F \propto q_1 q_2`,
      ],
      [
        T`Moving the spheres twice as far apart cut the force to a quarter; three times as far, to a ninth. The force is proportional to one over the square of the distance, called an inverse-square law.`,
        T`F \propto \frac{1}{r^2}`,
      ],
      [
        T`Both statements are true together.`,
        T`F \propto \frac{q_1 q_2}{r^2}`,
      ],
      [
        T`A proportion becomes an equation when multiplied by a fixed number, here the Coulomb constant $k$. Its large value, about $9 \times 10^{9}$, shows how strong the force is: two charges of one coulomb a metre apart would push with nine billion newtons.`,
        T`F = \frac{kq_1q_2}{r^2}`,
      ],
      [
        T`The equation gives the size of the force. For the direction, look at the signs: if $q_1q_2$ is positive (like charges) the force pushes them apart; if negative (unlike charges) it pulls them together.`,
        T`q_1q_2 > 0: \text{repel}, \qquad q_1q_2 < 0: \text{attract}`,
      ],
    ],
  },
  "electric-field-force": {
    about: T`An electric field is a region where a charge feels a force. The field strength, $E$, is the force on each coulomb of charge at a point. It works just like gravitational field strength $g$ (the force on each kilogram), with charge in place of mass. Knowing $E$ lets you find the force on any charge put there, using $F = qE$.`,
    idea: T`Field strength means force on each coulomb, so share the force equally among the coulombs.`,
    origin: [
      [
        T`Put a small positive charge $q$ at a point and measure the force $F$ on it. The field strength is the force on each coulomb, so share the force among the coulombs. Sharing equally is dividing.`,
        T`E = \frac{F}{q}`,
      ],
      [
        T`Why define it this way? A bigger charge feels a bigger force in the same place, so the force alone does not describe the place. But force divided by charge comes out the same whatever charge is used, so it is a property of the field itself.`,
        T`\frac{2F}{2q} = \frac{F}{q}`,
      ],
      [
        T`The unit follows from the division: newtons divided by coulombs.`,
        T`\frac{\text{N}}{\text{C}} = \text{N/C}`,
      ],
      [
        T`To find the force on a charge in a known field, undo the division by multiplying both sides by $q$.`,
        T`F = qE`,
      ],
      [
        T`The direction of the field is defined as the direction of the force on a positive charge. A negative charge has a negative $q$, so the equation gives it a force in the opposite direction: against the field.`,
        T`q > 0: F \text{ along } E, \qquad q < 0: F \text{ against } E`,
      ],
    ],
  },
  "point-charge-field": {
    about: T`This equation gives the strength of the electric field at a distance from a single small charge. The field points straight away from a positive charge and straight towards a negative one, and it weakens with the square of the distance: twice as far away, a quarter of the strength. It is the building block for more complicated fields, which are found by adding the fields of many charges.`,
    idea: T`Field strength is force on each coulomb. Imagine a small test charge at the point, find the force on it from Coulomb's law, and divide by the test charge.`,
    origin: [
      [
        T`To find the field at a point, imagine placing a small test charge $q_0$ there. The field strength is the force on the test charge divided by its charge.`,
        T`E = \frac{F}{q_0}`,
      ],
      [
        T`Coulomb's law gives the force between the charge $q$ that makes the field and the test charge $q_0$, when they are a distance $r$ apart.`,
        T`F = \frac{kqq_0}{r^2}`,
      ],
      [
        T`These are the same force, so write the second expression in place of $F$ in the first line. Dividing by $q_0$ is the same as multiplying by $\frac{1}{q_0}$.`,
        T`E = \frac{kqq_0}{r^2} \times \frac{1}{q_0}`,
      ],
      [
        T`There is a $q_0$ on the top line and a $q_0$ on the bottom. Anything divided by itself is 1, so they cancel.`,
        T`E = \frac{kq}{r^2}`,
      ],
      [
        T`The test charge has disappeared from the answer. So the field is there whether or not anything is placed in it, and depends only on the charge that makes it and the distance from it.`,
        T`E = \frac{kq}{r^2}`,
      ],
      [
        T`Why the square of the distance? The field spreads out evenly in all directions. At a distance $r$ it is spread over the surface of a sphere of area $4\pi r^2$. Doubling $r$ makes that area four times bigger, so the field is spread four times thinner.`,
        T`\frac{kq}{(2r)^2} = \frac{1}{4} \times \frac{kq}{r^2}`,
      ],
    ],
  },
  "uniform-field-plates": {
    about: T`Two flat metal plates facing each other, connected to a battery, make an electric field in the gap between them that is the same strength and direction everywhere (away from the edges). This "uniform field" is the simplest field there is, and is used to steer electron beams and in capacitors. Its strength depends only on the voltage across the plates and the size of the gap.`,
    idea: T`Work out the energy given to a charge that crosses the gap in two different ways, and set them equal.`,
    origin: [
      [
        T`Let a charge $q$ move from one plate to the other. The potential difference $V$ (the voltage) is defined as the energy transferred to each coulomb that crosses. So for $q$ coulombs the energy transferred, which is the work done, is:`,
        T`W = qV`,
      ],
      [
        T`Work can also be found as force times distance. The force on a charge in a field is $F = qE$, and it is the same all the way across because the field is uniform. The distance is the gap, $d$.`,
        T`W = F \times d = qE \times d`,
      ],
      [
        T`These are two ways of working out the same amount of work, so they must give the same answer.`,
        T`qV = qEd`,
      ],
      [
        T`Both sides are multiplied by $q$. Divide both sides by $q$ and it cancels.`,
        T`V = Ed`,
      ],
      [
        T`$E$ is multiplied by $d$. Divide both sides by $d$ to leave $E$ by itself, and write it on the left.`,
        T`E = \frac{V}{d}`,
      ],
      [
        T`This shows a second unit for field strength, volts per metre, which is exactly the same as newtons per coulomb. It also tells you how to get a strong field: a large voltage across a small gap.`,
        T`1\ \text{V/m} = 1\ \text{N/C}`,
      ],
      [
        T`The working assumed the force is the same all the way across. That is true between large plates that are close together, but near the edges the field bulges outwards and is weaker.`,
        T`E = \frac{V}{d} \quad \text{(away from the edges)}`,
      ],
    ],
  },
  "electric-work": {
    about: T`When a charge moves through a potential difference (a voltage), energy is transferred. This equation says how much. It is the reason voltage matters: a volt is a joule for every coulomb. The same idea covers a battery pushing charge round a circuit, an electron accelerated in an old television tube, and a spark jumping a gap.`,
    idea: T`This is the definition of potential difference, rearranged.`,
    origin: [
      [
        T`Potential difference between two points is defined as the energy transferred for each coulomb of charge that moves between them. If an energy $W$ is transferred when a charge $q$ moves, share the energy equally among the coulombs.`,
        T`V = \frac{W}{q}`,
      ],
      [
        T`The unit follows from the division: joules divided by coulombs. One joule per coulomb is called one volt. A 9 V battery gives 9 J to every coulomb that passes through it.`,
        T`1\,\text{V} = 1\,\text{J/C}`,
      ],
      [
        T`To find the energy, undo the division by multiplying both sides by $q$. On the right, the $q$ cancels.`,
        T`qV = W`,
      ],
      [
        T`Write it with the energy on the left.`,
        T`W = qV`,
      ],
      [
        T`Nothing in this depends on the route the charge takes or on how far apart the two points are. Only the amount of charge and the potential difference matter, just as the energy gained by falling depends only on the height dropped.`,
        T`W = qV`,
      ],
    ],
  },
  "current-charge": {
    about: T`Electric current is the rate at which charge flows: how many coulombs pass a point in a circuit each second. One coulomb per second is one ampere. In a metal wire the charge is carried by electrons, each with a tiny charge, so even a small current means an enormous number of electrons passing every second (about six million million million per second for one ampere).`,
    idea: T`Current means charge passing in each second, so share the charge equally among the seconds.`,
    origin: [
      [
        T`Current tells you how much charge passes a point in each second. If a charge $q$ passes in a time $t$, share the charge equally among the seconds. Sharing equally is dividing.`,
        T`I = \frac{q}{t}`,
      ],
      [
        T`The unit follows from the division: coulombs divided by seconds. One coulomb per second is called one ampere (amp for short).`,
        T`1\,\text{A} = 1\,\text{C/s}`,
      ],
      [
        T`To find how much charge has flowed, undo the division by multiplying both sides by $t$. A current of 2 A flowing for 10 s moves 20 C.`,
        T`q = It`,
      ],
      [
        T`To find how long it takes for a given charge to pass, divide both sides of that by $I$.`,
        T`t = \frac{q}{I}`,
      ],
    ],
  },
  "ohms-law": {
    about: T`This equation links the three basic quantities in a circuit: the potential difference (voltage) across a component, the current through it, and its resistance. Resistance is a measure of how hard it is to push current through something. For many conductors, such as a metal wire kept at a steady temperature, the resistance stays the same whatever the voltage, so the current is proportional to the voltage. That behaviour is Ohm's law.`,
    idea: T`Resistance is defined as voltage divided by current. Rearranging that definition gives the equation.`,
    origin: [
      [
        T`Resistance is defined as the potential difference across a component divided by the current through it. It says how many volts are needed to drive each ampere.`,
        T`R = \frac{V}{I}`,
      ],
      [
        T`The unit follows from the division: volts divided by amperes. One volt per ampere is called one ohm, written $\Omega$.`,
        T`1\,\Omega = 1\,\text{V/A}`,
      ],
      [
        T`Undo the division by multiplying both sides by $I$. On the right, the $I$ cancels.`,
        T`IR = V`,
      ],
      [
        T`Write it with $V$ on the left.`,
        T`V = IR`,
      ],
      [
        T`So far this is only a definition, true for any component. Ohm's law is the extra fact, found by experiment, that for a metal wire at a steady temperature $R$ stays the same when the voltage changes. Then doubling $V$ doubles $I$: the current is proportional to the voltage (the sign $\propto$ means "is proportional to").`,
        T`I \propto V \quad \text{(when } R \text{ is constant)}`,
      ],
      [
        T`Not everything behaves like this. A lamp filament gets hot and its resistance rises; a diode lets current through one way only. For those, $V = IR$ still gives the resistance at any moment, but $R$ changes.`,
        T`R = \frac{V}{I} \quad \text{(always true)}`,
      ],
    ],
  },
  "electrical-power": {
    about: T`Electrical power is the energy transferred each second by an electric current. It equals the potential difference multiplied by the current. This is how the wattage of every electrical appliance is worked out: a 230 V kettle drawing 9 A is transferring about 2000 joules every second.`,
    idea: T`Power is energy divided by time; the energy given to charge is $qV$; and charge divided by time is current.`,
    origin: [
      [
        T`Power is the energy transferred divided by the time taken.`,
        T`P = \frac{W}{t}`,
      ],
      [
        T`When a charge $q$ moves through a potential difference $V$, the energy transferred is $W = qV$ (that is what potential difference means: energy for each coulomb). Since $W$ and $qV$ are equal, write $qV$ in place of $W$.`,
        T`P = \frac{qV}{t}`,
      ],
      [
        T`A fraction with a product on top can be split: $\frac{qV}{t}$ is the same as $V$ multiplied by $\frac{q}{t}$.`,
        T`P = V \times \frac{q}{t}`,
      ],
      [
        T`Charge divided by time is the current, $I = \frac{q}{t}$. Since they are the same thing, write $I$ in place of $\frac{q}{t}$.`,
        T`P = VI`,
      ],
      [
        T`Read it in words: volts are joules per coulomb, and amperes are coulombs per second. Multiply them and the coulombs cancel, leaving joules per second, which are watts.`,
        T`\frac{\text{J}}{\text{C}} \times \frac{\text{C}}{\text{s}} = \frac{\text{J}}{\text{s}} = \text{W}`,
      ],
    ],
  },
  "power-current-resistance": {
    about: T`When current flows through a resistance, electrical energy is turned into heat. This equation gives the rate of heating from the current and the resistance alone. Because the current is squared, doubling the current makes four times the heat. It is why thin extension leads get warm, why fuses melt, and why the electricity grid uses high voltages to keep currents small.`,
    idea: T`Start from $P = VI$ and use $V = IR$ to replace the voltage.`,
    origin: [
      [
        T`Start from the equation for electrical power: potential difference times current.`,
        T`P = VI`,
      ],
      [
        T`For a resistor, the potential difference across it is related to the current through it by $V = IR$.`,
        T`V = IR`,
      ],
      [
        T`Since $V$ and $IR$ are the same quantity, write $IR$ in place of $V$ in the power equation.`,
        T`P = (IR) \times I`,
      ],
      [
        T`The order of multiplying does not matter, so bring the two $I$'s together. $I \times I$ is written $I^2$.`,
        T`P = I^2R`,
      ],
      [
        T`Because the current is squared, doubling it gives $2 \times 2 = 4$ times the power.`,
        T`(2I)^2R = 4I^2R`,
      ],
      [
        T`There is a third form, useful when you know the voltage instead of the current. From $V = IR$, the current is $I = \frac{V}{R}$; putting that into $P = VI$ gives:`,
        T`P = V \times \frac{V}{R} = \frac{V^2}{R}`,
      ],
    ],
  },
  "series-resistors": {
    about: T`Resistors are in series when they are connected one after another, so that the same current has to pass through each in turn. Their resistances simply add up, so the total is always bigger than any one of them. Old-style fairy lights were wired this way, which is why one failed bulb put the whole string out.`,
    idea: T`Use two facts about a series circuit (same current everywhere; voltages add) together with $V = IR$ for each resistor.`,
    origin: [
      [
        T`In a series circuit there is only one path. Charge cannot pile up or leak away, so whatever current flows into one resistor flows out of it and into the next. The current is the same in all of them.`,
        T`I_1 = I_2 = I_3 = I`,
      ],
      [
        T`Each coulomb of charge gets a certain energy from the supply (the supply voltage $V$) and spends some of it in each resistor. Energy is conserved, so the amounts spent add up to the amount supplied.`,
        T`V = V_1 + V_2 + V_3`,
      ],
      [
        T`For each resistor, the voltage across it is its current times its resistance, and the current is $I$ for all of them.`,
        T`V_1 = IR_1, \qquad V_2 = IR_2, \qquad V_3 = IR_3`,
      ],
      [
        T`Imagine replacing all three with one resistor $R$ that takes the same current from the same supply. For that one resistor, $V = IR$.`,
        T`V = IR`,
      ],
      [
        T`Now write each of these in place of the matching voltage in the second line.`,
        T`IR = IR_1 + IR_2 + IR_3`,
      ],
      [
        T`Every term on both sides is multiplied by $I$. Dividing both sides by $I$ divides every term by $I$, which removes it from each one.`,
        T`R = R_1 + R_2 + R_3`,
      ],
      [
        T`So adding a resistor in series always increases the total resistance and reduces the current.`,
        T`R > R_{largest}`,
      ],
    ],
  },
  "parallel-resistors": {
    about: T`Resistors are in parallel when each is connected directly across the same two points, giving the current several routes to choose from. Adding another route always makes it easier for current to flow, so the total resistance goes down and is always less than the smallest resistor. House wiring is parallel, so every appliance gets the full mains voltage and works independently of the others.`,
    idea: T`Use two facts about a parallel circuit (same voltage across each branch; currents add) together with $I = \frac{V}{R}$ for each resistor.`,
    origin: [
      [
        T`In a parallel circuit both ends of every resistor are joined to the same two points, so each one has the full supply voltage across it.`,
        T`V_1 = V_2 = V_3 = V`,
      ],
      [
        T`The current from the supply reaches a junction and splits between the branches. Charge is not created or lost at the junction, so the branch currents add up to the supply current.`,
        T`I = I_1 + I_2 + I_3`,
      ],
      [
        T`For each resistor, rearranging $V = IR$ (divide both sides by $R$) gives the current as voltage divided by resistance. The voltage is $V$ for all of them.`,
        T`I_1 = \frac{V}{R_1}, \qquad I_2 = \frac{V}{R_2}, \qquad I_3 = \frac{V}{R_3}`,
      ],
      [
        T`Imagine replacing all three with one resistor $R$ that takes the same total current from the same supply. For that one resistor:`,
        T`I = \frac{V}{R}`,
      ],
      [
        T`Now write each of these in place of the matching current in the second line.`,
        T`\frac{V}{R} = \frac{V}{R_1} + \frac{V}{R_2} + \frac{V}{R_3}`,
      ],
      [
        T`Every term on both sides has $V$ on top. Dividing both sides by $V$ divides every term by $V$, leaving 1 on top of each.`,
        T`\frac{1}{R} = \frac{1}{R_1} + \frac{1}{R_2} + \frac{1}{R_3}`,
      ],
      [
        T`This gives $\frac{1}{R}$, not $R$. To finish a calculation, add the fractions and then turn the answer upside down. For example, $10\,\Omega$ and $10\,\Omega$ in parallel: $\frac{1}{10} + \frac{1}{10} = \frac{2}{10}$, so $R = \frac{10}{2} = 5\,\Omega$.`,
        T`R = \frac{1}{\frac{1}{R_1} + \frac{1}{R_2} + \frac{1}{R_3}}`,
      ],
      [
        T`Each extra branch adds something to the right-hand side, making $\frac{1}{R}$ bigger and so $R$ smaller. The total is always less than the smallest resistor.`,
        T`R < R_{smallest}`,
      ],
    ],
  },
  "force-on-moving-charge": {
    about: T`A magnetic field pushes on a charge only if the charge is moving, and the push is sideways: at right angles both to the direction of motion and to the field. This is what bends the beam in an old television tube, steers particles round an accelerator and makes the aurora follow the Earth's field lines. The force is largest when the charge moves straight across the field and zero when it moves along it.`,
    idea: T`This is an experimental law. It also defines the unit of magnetic field, the tesla.`,
    origin: [
      [
        T`Fire a beam of charged particles straight across a magnetic field and it bends. Measurements show the sideways force doubles if the charge doubles, doubles if the speed doubles, and doubles if the field strength doubles. Being proportional to each of the three means being proportional to their product.`,
        T`F \propto qvB`,
      ],
      [
        T`The unit of magnetic field strength, the tesla, is chosen so that no extra number is needed: a field of 1 T pushes with 1 N on a charge of 1 C moving across it at 1 m/s.`,
        T`F = qvB \quad (\text{moving straight across the field})`,
      ],
      [
        T`Now let the charge move at an angle $\theta$ to the field. Its velocity can be treated as two velocities added together: one along the field and one straight across it. Drawing the velocity as the long side of a right-angled triangle, the side across the field is opposite the angle $\theta$, so its size is $v\sin\theta$.`,
        T`v_{\perp} = v\sin\theta`,
      ],
      [
        T`Experiments show that motion along the field produces no force at all. Only the part of the velocity across the field counts, so use $v\sin\theta$ in place of $v$.`,
        T`F = q \times v\sin\theta \times B`,
      ],
      [
        T`Written in the usual order:`,
        T`F = qvB\sin\theta`,
      ],
      [
        T`The force is at right angles to the velocity, so it never speeds the charge up or slows it down: it only changes its direction. That is why a charge in a magnetic field moves in a curve at a steady speed.`,
        T`F \perp v \quad\Rightarrow\quad \text{speed unchanged}`,
      ],
    ],
  },
  "force-on-wire": {
    about: T`A wire carrying a current in a magnetic field feels a force. This "motor effect" is what turns every electric motor and moves the cone of a loudspeaker. The force is at right angles to both the wire and the field, and is greatest when the wire lies straight across the field. It depends on the field strength, the current and the length of wire that is inside the field.`,
    idea: T`A current is moving charge, and we know the force on a moving charge. Add up the force on all the charge in a length of wire.`,
    origin: [
      [
        T`A current is a stream of moving charges, and a magnetic field pushes on each one. For an amount of charge $q$ moving at speed $v$ straight across a field $B$, the force is:`,
        T`F = qvB`,
      ],
      [
        T`Consider all the moving charge that is inside a length $\ell$ of the wire at one moment; call its total $q$. How long does that charge take to flow out of the end? It has to travel the length $\ell$ at speed $v$, and time is distance divided by speed.`,
        T`t = \frac{\ell}{v}`,
      ],
      [
        T`Current is the charge that passes divided by the time it takes: $I = \frac{q}{t}$. Write $\frac{\ell}{v}$ in place of $t$.`,
        T`I = q \div \frac{\ell}{v}`,
      ],
      [
        T`Dividing by a fraction is the same as multiplying by that fraction turned upside down.`,
        T`I = q \times \frac{v}{\ell} = \frac{qv}{\ell}`,
      ],
      [
        T`Multiply both sides by $\ell$ to remove the division.`,
        T`I\ell = qv`,
      ],
      [
        T`So the product $qv$ for the charge in the wire is the same as $I\ell$. In the first line the force is $qv \times B$; write $I\ell$ in place of $qv$.`,
        T`F = I\ell B = BI\ell`,
      ],
      [
        T`This was for a wire lying straight across the field. If the wire is at an angle $\theta$ to the field, the charges move at that angle, and only the part of their motion across the field feels a force. As for a single charge, that brings in a factor of $\sin\theta$.`,
        T`F = BI\ell\sin\theta`,
      ],
      [
        T`A wire lying along the field ($\theta = 0^\circ$) feels no force, because $\sin 0^\circ = 0$.`,
        T`\sin 0^\circ = 0 \;\Rightarrow\; F = 0`,
      ],
    ],
  },
  "field-of-wire": {
    about: T`An electric current makes a magnetic field around itself. Around a long straight wire the field lines are circles centred on the wire, and the field gets weaker as you move away. This equation gives its strength. The direction follows the right-hand grip rule: point your right thumb along the current and your fingers curl the way the field goes.`,
    idea: T`The pattern is found by experiment; the constant in front comes from how the units are defined.`,
    origin: [
      [
        T`Sprinkle iron filings on a card with a current-carrying wire through it, or move a small compass round the wire: the field lines are circles round the wire. Measuring the field at a fixed distance shows that doubling the current doubles the field. (The sign $\propto$ means "is proportional to".)`,
        T`B \propto I`,
      ],
      [
        T`Measuring at different distances shows that twice as far away the field is half as strong; three times as far, a third. The field is proportional to one over the distance.`,
        T`B \propto \frac{1}{r}`,
      ],
      [
        T`This is not an inverse-square law. The field of a small source spreads over a sphere, whose area grows as $r^2$. The field of a long wire spreads out sideways only, round a circle whose circumference grows as $r$.`,
        T`\text{circumference} = 2\pi r`,
      ],
      [
        T`Both statements are true together.`,
        T`B \propto \frac{I}{r}`,
      ],
      [
        T`A proportion becomes an equation when multiplied by a fixed number. It is written as $\frac{\mu_0}{2\pi}$, where $\mu_0$ ("mu nought") is called the permeability of free space. Writing it this way puts the circumference $2\pi r$ of the field line on the bottom.`,
        T`B = \frac{\mu_0 I}{2\pi r}`,
      ],
      [
        T`The value of $\mu_0$ is very small, so everyday currents make weak fields: 5 A gives only one millionth of a tesla at a distance of 1 m, about a fiftieth of the Earth's field.`,
        T`B = \frac{1.26 \times 10^{-6} \times 5}{2\pi \times 1} = 1.0 \times 10^{-6}\ \text{T}`,
      ],
    ],
  },
  "magnetic-flux": {
    about: T`Magnetic flux measures how much magnetic field passes through a loop or coil. You can picture it as counting the field lines that thread through the loop. It depends on how strong the field is, how big the loop is, and how the loop is tilted: a loop facing the field catches the most, and a loop turned edge-on catches none. Flux matters because a changing flux is what generates a voltage (see Faraday's law).`,
    idea: T`For a loop facing the field, flux is field strength times area. For a tilted loop, use only the part of the field that goes through the loop.`,
    origin: [
      [
        T`Magnetic field strength $B$ can be thought of as how densely the field lines are packed. For a loop held square-on to the field, the flux through it is the field strength multiplied by the loop's area.`,
        T`\Phi = BA \quad (\text{loop facing the field})`,
      ],
      [
        T`To describe a tilted loop we need a way to say which way it faces. We use its normal: an imaginary line sticking straight out of the loop's surface, at right angles to it. $\theta$ is the angle between the field and this normal. When the loop faces the field, the normal points along the field and $\theta = 0^\circ$.`,
        T`\theta = \text{angle between } B \text{ and the normal}`,
      ],
      [
        T`The field can be treated as two fields added together: one along the normal, which passes straight through the loop, and one lying flat along the loop's surface, which skims past without going through. Drawing $B$ as the long side of a right-angled triangle, the side along the normal is next to the angle $\theta$, so its size is $B\cos\theta$.`,
        T`B_{\text{through}} = B\cos\theta`,
      ],
      [
        T`Only the part that goes through the loop contributes to the flux. Use $B\cos\theta$ in place of $B$ in the first line.`,
        T`\Phi = B\cos\theta \times A`,
      ],
      [
        T`Written in the usual order:`,
        T`\Phi = BA\cos\theta`,
      ],
      [
        T`Check the two extremes. Facing the field, $\theta = 0^\circ$ and $\cos\theta = 1$, giving the full $BA$. Edge-on, $\theta = 90^\circ$ and $\cos\theta = 0$: no field passes through.`,
        T`\cos 0^\circ = 1, \qquad \cos 90^\circ = 0`,
      ],
    ],
  },
  "faradays-law": {
    about: T`Faraday's law is the principle behind every generator, transformer and induction hob. It says that a voltage (called an induced e.m.f.) appears in a coil whenever the magnetic flux through the coil is changing. The faster the flux changes, and the more turns the coil has, the bigger the voltage. A steady flux, however large, gives nothing at all: only change matters.`,
    idea: T`This is an experimental law discovered by Michael Faraday in 1831. The minus sign records the direction of the e.m.f.`,
    origin: [
      [
        T`Push a magnet into a coil connected to a meter and the needle flicks. Hold the magnet still and the needle returns to zero, however strong the magnet. Pull it out and the needle flicks the other way. An e.m.f. appears only while the flux through the coil is changing.`,
        T`\text{e.m.f. only while } \Phi \text{ changes}`,
      ],
      [
        T`Move the magnet faster and the reading is bigger. Careful measurements show that for a single loop the size of the e.m.f. equals the change in flux divided by the time the change takes: the rate of change of flux. ($\Delta$ means "change in".)`,
        T`\text{size of e.m.f. in one turn} = \frac{\Delta\Phi}{\Delta t}`,
      ],
      [
        T`A coil with $N$ turns is $N$ loops joined end to end, each with the same changing flux through it. Like cells joined in series, their voltages add up, so the total is $N$ times as much.`,
        T`\text{size of e.m.f.} = N\,\frac{\Delta\Phi}{\Delta t}`,
      ],
      [
        T`The direction of the e.m.f. is given by Lenz's law: it always acts to oppose the change that is causing it. Push a north pole in and the coil's own current makes a north pole facing it, pushing back. A minus sign is put in the equation to show this opposition.`,
        T`\varepsilon = -N\,\frac{\Delta\Phi}{\Delta t}`,
      ],
      [
        T`The opposition has to be that way round because of energy. If the coil helped the magnet in, the magnet would speed up, making a bigger current, pulling harder still: energy from nothing. Instead you must do work pushing against the opposing force, and that work is where the electrical energy comes from.`,
        T`\text{work done pushing the magnet} = \text{electrical energy produced}`,
      ],
    ],
  },
  "motional-emf": {
    about: T`When a metal rod moves across a magnetic field, a voltage appears between its ends. This is the simplest kind of generator. The voltage depends on the field strength, the length of the rod and how fast it moves. The same thing happens in an aeroplane's wings as it flies through the Earth's magnetic field, and in the moving parts of every dynamo.`,
    idea: T`The rod and its rails make a loop whose area grows as the rod moves, so the flux through it changes. Faraday's law then gives the e.m.f.`,
    origin: [
      [
        T`Picture a rod of length $\ell$ sliding at speed $v$ along two metal rails, with a magnetic field $B$ passing straight through the loop made by the rod and the rails. In a short time $\Delta t$ the rod moves a distance equal to speed times time.`,
        T`\text{distance moved} = v\,\Delta t`,
      ],
      [
        T`As the rod moves, the loop gets bigger. The extra area is a rectangle: its length is the rod's length $\ell$ and its width is the distance the rod moved.`,
        T`\Delta A = \ell \times v\,\Delta t`,
      ],
      [
        T`Flux is field strength times area (for a field straight through the loop). The field has not changed, so the extra flux is the field times the extra area.`,
        T`\Delta\Phi = B \times \Delta A`,
      ],
      [
        T`We have just found that $\Delta A = \ell v\,\Delta t$, so write that in place of $\Delta A$.`,
        T`\Delta\Phi = B\ell v\,\Delta t`,
      ],
      [
        T`Faraday's law says the size of the e.m.f. in a single loop is the change in flux divided by the time taken.`,
        T`\varepsilon = \frac{\Delta\Phi}{\Delta t}`,
      ],
      [
        T`Write $B\ell v\,\Delta t$ in place of $\Delta\Phi$.`,
        T`\varepsilon = \frac{B\ell v\,\Delta t}{\Delta t}`,
      ],
      [
        T`There is a $\Delta t$ on the top and on the bottom. They cancel.`,
        T`\varepsilon = B\ell v`,
      ],
      [
        T`This is for the case drawn: the rod, its motion and the field are all at right angles to one another. If the rod moves along the field, it cuts no field lines and there is no e.m.f.`,
        T`\varepsilon = B\ell v \quad (B,\ \ell \text{ and } v \text{ at right angles})`,
      ],
    ],
  },
  transformer: {
    about: T`A transformer changes the size of an alternating voltage. It has two coils wound on the same iron core: the primary, which is fed from the supply, and the secondary, which delivers the output. The ratio of the two voltages equals the ratio of the numbers of turns. More turns on the secondary steps the voltage up; fewer steps it down. Phone chargers, power stations and the national grid all rely on them.`,
    idea: T`Both coils have the same changing flux through every turn. Apply Faraday's law to each coil and divide one result by the other.`,
    origin: [
      [
        T`An alternating current in the primary coil makes a magnetic field that keeps changing. The iron core guides that field round to the secondary. In an ideal transformer every bit of the flux passes through every turn of both coils, so the flux changes at the same rate in every turn.`,
        T`\frac{\Delta\Phi}{\Delta t} \text{ is the same for every turn}`,
      ],
      [
        T`Faraday's law says the voltage across a coil is its number of turns times the rate of change of flux through each turn. (We need only the sizes here, so the minus sign is left out.) For the primary coil, with $N_p$ turns:`,
        T`V_p = N_p\,\frac{\Delta\Phi}{\Delta t}`,
      ],
      [
        T`And for the secondary coil, with $N_s$ turns:`,
        T`V_s = N_s\,\frac{\Delta\Phi}{\Delta t}`,
      ],
      [
        T`Divide the first equation by the second. If two things are equal and two other things are equal, then dividing the first pair gives the same answer as dividing the second pair. So the left sides divided equal the right sides divided.`,
        T`\frac{V_p}{V_s} = \frac{N_p\,\frac{\Delta\Phi}{\Delta t}}{N_s\,\frac{\Delta\Phi}{\Delta t}}`,
      ],
      [
        T`The rate of change of flux appears on the top and on the bottom, and it is the same in both, so it cancels.`,
        T`\frac{V_p}{V_s} = \frac{N_p}{N_s}`,
      ],
      [
        T`A transformer needs a changing flux, so it works only with alternating current. A steady direct current makes a steady flux, the rate of change is zero, and no voltage appears on the secondary.`,
        T`\frac{\Delta\Phi}{\Delta t} = 0 \;\Rightarrow\; V_s = 0`,
      ],
      [
        T`A transformer does not create energy. If the voltage is stepped up, the current is stepped down by the same factor, so that the power out (at best) equals the power in.`,
        T`V_pI_p = V_sI_s \quad \text{(ideal transformer)}`,
      ],
    ],
  },
};
