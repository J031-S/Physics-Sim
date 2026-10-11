// "What it is about" and "Where it comes from" for the minitools on motion,
// forces, energy and momentum. No DOM. See explain.js for how these are used.
//
// Written for a student meeting the equation for the first time:
//   about   a few sentences on what the equation describes and when it is
//           used, shown at the top of the page
//   idea    the plan of the derivation in a sentence or two, shown before the
//           steps
//   origin  the steps [sentence, LaTeX]. Each step makes one change. Where one
//           thing is written in place of another, the step says why the two
//           are equal. Nothing is called "obvious"; results that need more
//           mathematics than the course has are said to be taken on trust.
//
// Sentences may hold mathematics between $ signs.

const T = String.raw;

export const mechanics = {
  "suvat-v-u-at": {
    about: T`This equation tells you how fast something is going after it has been speeding up (or slowing down) at a steady rate for a known time. A car pulling away from traffic lights, a ball dropped from a window and a train braking into a station are all examples. It works only while the acceleration stays the same; if the acceleration changes part of the way, use the equation separately for each part.`,
    idea: T`The equation is just the definition of acceleration, rearranged so that the final velocity is the subject.`,
    origin: [
      [
        T`Acceleration means how much the velocity changes in each second. To find it, take the whole change in velocity and share it equally between the seconds it took, which is a division.`,
        T`a = \frac{\text{change in velocity}}{\text{time taken}}`,
      ],
      [
        T`The change in velocity is what you end with minus what you started with. The velocity at the start is called $u$ and the velocity at the end is called $v$, so the change is $v - u$. The time taken is $t$.`,
        T`a = \frac{v - u}{t}`,
      ],
      [
        T`We want $v$ by itself. First remove the division by $t$. Multiplying undoes dividing, and doing the same thing to both sides keeps them equal, so multiply both sides by $t$. On the right the $t$ on top cancels the $t$ underneath.`,
        T`at = v - u`,
      ],
      [
        T`On the right, $u$ is being subtracted from $v$. Adding undoes subtracting, so add $u$ to both sides. On the right, $-u + u$ is zero, which leaves $v$ alone.`,
        T`at + u = v`,
      ],
      [
        T`An equation says the two sides are the same, so it can be read from either end. Write it with $v$ on the left, and put $u$ first on the right because it is where the velocity starts.`,
        T`v = u + at`,
      ],
      [
        T`Read it in words: the final velocity is the starting velocity plus the amount gained. The amount gained is the gain in each second, $a$, multiplied by the number of seconds, $t$. If the object is slowing down, $a$ is negative and the "gain" is a loss.`,
        T`\text{final} = \text{start} + (\text{gain each second}) \times (\text{seconds})`,
      ],
    ],
  },
  "suvat-s-ut-at2": {
    about: T`This equation gives the displacement (how far something is from where it started, and in which direction) after it has moved for a known time with a steady acceleration. It is the one to use when you know the starting velocity, the acceleration and the time but not the final velocity. A stone dropped down a well, or a car accelerating along a slip road, are typical uses.`,
    idea: T`Distance is average velocity multiplied by time. With a steady acceleration the average velocity is halfway between the starting and final velocities, and the final velocity can be written using $v = u + at$.`,
    origin: [
      [
        T`For anything that moves, the displacement is the average velocity multiplied by the time. (Travelling at an average of 20 m/s for 3 s takes you 60 m.)`,
        T`s = v_{av} \times t`,
      ],
      [
        T`When the acceleration is steady, the velocity rises by the same amount every second, like climbing evenly spaced steps from $u$ to $v$. The average of evenly spaced values is halfway between the first and the last: add them and divide by 2.`,
        T`v_{av} = \frac{u + v}{2}`,
      ],
      [
        T`These two expressions for the average velocity are equal, so the second can be written in place of $v_{av}$ in the first line.`,
        T`s = \frac{u + v}{2} \times t`,
      ],
      [
        T`This still contains $v$, which we do not know. But for steady acceleration $v = u + at$ (see "Velocity after a time"). Because $v$ and $u + at$ are the same number, we may write $u + at$ wherever $v$ appears.`,
        T`s = \frac{u + (u + at)}{2} \times t`,
      ],
      [
        T`On the top line there are two $u$'s being added: $u + u = 2u$.`,
        T`s = \frac{2u + at}{2} \times t`,
      ],
      [
        T`Dividing a sum by 2 means dividing each part by 2. Half of $2u$ is $u$, and half of $at$ is $\tfrac{1}{2}at$.`,
        T`s = \left(u + \tfrac{1}{2}at\right) \times t`,
      ],
      [
        T`Multiply out the bracket: the $t$ outside multiplies each term inside. $u \times t = ut$, and $\tfrac{1}{2}at \times t = \tfrac{1}{2}at^2$ because $t \times t$ is written $t^2$.`,
        T`s = ut + \tfrac{1}{2}at^2`,
      ],
      [
        T`Read it in words: $ut$ is how far it would have gone at its starting velocity, and $\tfrac{1}{2}at^2$ is the extra distance from speeding up. The time is squared in that part because a longer time gives both more speed gained and longer to use it.`,
        T`s = \underbrace{ut}_{\text{no acceleration}} + \underbrace{\tfrac{1}{2}at^2}_{\text{extra from accelerating}}`,
      ],
    ],
  },
  "suvat-v2-u2-2as": {
    about: T`This equation links the velocities at the start and end of a journey to the distance covered, without needing the time. It is the one to reach for in questions such as "how fast is the car going after 50 m?" or "how far does it take to stop from 20 m/s?". Like the other equations of motion, it needs the acceleration to be steady.`,
    idea: T`Two equations we already have both contain the time $t$. Find $t$ from one, write that in the other, and the time disappears.`,
    origin: [
      [
        T`Start from the equation for velocity after a time, which holds for steady acceleration.`,
        T`v = u + at`,
      ],
      [
        T`Make $t$ the subject, one move at a time. First subtract $u$ from both sides, which leaves only the term containing $t$ on the right.`,
        T`v - u = at`,
      ],
      [
        T`Now $t$ is multiplied by $a$. Dividing undoes multiplying, so divide both sides by $a$.`,
        T`t = \frac{v - u}{a}`,
      ],
      [
        T`Next take the equation for displacement from the average velocity: displacement is the average of $u$ and $v$, multiplied by the time.`,
        T`s = \frac{u + v}{2} \times t`,
      ],
      [
        T`We found that $t$ equals $\frac{v - u}{a}$. Since they are the same quantity, write $\frac{v - u}{a}$ in place of $t$. This is the step that removes the time.`,
        T`s = \frac{(v + u)}{2} \times \frac{(v - u)}{a}`,
      ],
      [
        T`To multiply two fractions, multiply the top lines together and the bottom lines together.`,
        T`s = \frac{(v + u)(v - u)}{2a}`,
      ],
      [
        T`Multiply out the two brackets on top: each term in the first multiplies each term in the second, giving $v \times v$, $-v \times u$, $u \times v$ and $-u \times u$. The two middle terms are $-uv$ and $+uv$, which add to zero, so only $v^2 - u^2$ is left.`,
        T`s = \frac{v^2 - u^2}{2a}`,
      ],
      [
        T`Remove the division by $2a$ by multiplying both sides by $2a$.`,
        T`2as = v^2 - u^2`,
      ],
      [
        T`Add $u^2$ to both sides so that $v^2$ is by itself, and write that side first.`,
        T`v^2 = u^2 + 2as`,
      ],
      [
        T`To get $v$ itself, take the square root at the end. A square root has two answers, one positive and one negative; choose the sign that matches the direction the object is actually moving.`,
        T`v = \pm\sqrt{u^2 + 2as}`,
      ],
    ],
  },
  "suvat-average-velocity": {
    about: T`This equation gives the displacement when you know the velocities at the start and at the end and the time between them, but not the acceleration. It is often the quickest of the equations of motion: a car that goes steadily from 10 m/s to 20 m/s in 4 s has averaged 15 m/s, so it has covered 60 m. It needs the velocity to change at a steady rate.`,
    idea: T`Displacement is average velocity multiplied by time, and with a steady acceleration the average velocity is exactly halfway between the starting and final velocities.`,
    origin: [
      [
        T`Displacement is the average velocity multiplied by the time taken. This is what "average velocity" means: the single steady velocity that would cover the same displacement in the same time.`,
        T`s = v_{av} \times t`,
      ],
      [
        T`With a steady acceleration the velocity changes by equal amounts in equal times, so a graph of velocity against time is a straight line from $u$ to $v$. The object spends as long below the halfway value as above it, so its average is exactly the halfway value: add the two and divide by 2.`,
        T`v_{av} = \frac{u + v}{2}`,
      ],
      [
        T`The two expressions for $v_{av}$ are equal, so write $\frac{u + v}{2}$ in place of $v_{av}$ in the first line.`,
        T`s = \frac{u + v}{2} \times t`,
      ],
      [
        T`Dividing by 2 is the same as multiplying by a half, so this is usually written with the half at the front.`,
        T`s = \tfrac{1}{2}(u + v)t`,
      ],
      [
        T`There is a picture of this. On a velocity–time graph, displacement is the area under the line. Here the shape under the line is a trapezium with parallel sides $u$ and $v$ and width $t$, and the area of a trapezium is half the sum of the parallel sides times the width.`,
        T`\text{area} = \tfrac{1}{2}(u + v) \times t`,
      ],
      [
        T`If the acceleration is not steady the line on the graph is curved, the object does not spend equal times above and below the halfway velocity, and this equation no longer holds.`,
        T`s = \tfrac{1}{2}(u + v)t \quad \text{(steady acceleration only)}`,
      ],
    ],
  },
  "average-velocity": {
    about: T`Average velocity is the overall displacement divided by the time it took: the steady velocity that would have got you from the same start to the same finish in the same time. It ignores everything that happened on the way, so a runner who sprints, stops and jogs has one average velocity for the whole run. Because displacement has a direction, so does average velocity: going back the way you came gives a negative value.`,
    idea: T`Velocity means displacement in each second, so share the whole displacement equally among the seconds.`,
    origin: [
      [
        T`Velocity tells you how much the position changes in each second. If the object covers a displacement $s$ in a time $t$, share $s$ equally among the $t$ seconds. Sharing equally is dividing.`,
        T`v_{av} = \frac{s}{t}`,
      ],
      [
        T`It is called an average because the object need not have moved steadily. It may have gone faster for part of the time and slower for the rest. Only the total displacement and the total time enter the calculation.`,
        T`\text{average velocity} = \frac{\text{total displacement}}{\text{total time}}`,
      ],
      [
        T`Displacement is not the same as distance travelled. Displacement is the straight-line change in position, with a direction. Run once round a 400 m track and your distance is 400 m but your displacement is zero, so your average velocity is zero even though your average speed is not.`,
        T`\text{average speed} = \frac{\text{total distance}}{\text{total time}}`,
      ],
      [
        T`The unit follows from the division: metres divided by seconds gives metres per second.`,
        T`\frac{\text{m}}{\text{s}} = \text{m/s}`,
      ],
      [
        T`To find the displacement instead, undo the division by multiplying both sides by $t$.`,
        T`s = v_{av}\,t`,
      ],
    ],
  },
  "newtons-second-law": {
    about: T`Newton's second law says how the motion of an object changes when forces act on it. The net force (all the forces added together, allowing for their directions) equals the mass multiplied by the acceleration. A bigger net force gives more acceleration; a bigger mass gives less. If the forces balance, the net force is zero and the object does not accelerate: it stays at rest or keeps moving at a steady velocity.`,
    idea: T`The law is not worked out from anything simpler. It summarises what experiments show, and the unit of force is chosen to make it as simple as possible.`,
    origin: [
      [
        T`Pull a trolley with one elastic band stretched by a fixed amount, then with two, then three. Measurements show that twice the force gives twice the acceleration, and three times the force gives three times. Two quantities that go up together in step like this are called proportional, written with the sign $\propto$.`,
        T`a \propto F`,
      ],
      [
        T`Now keep the force the same and stack trolleys to change the mass. Twice the mass gives half the acceleration; three times the mass gives a third. When one quantity is halved as the other doubles, it is proportional to "one over" the other.`,
        T`a \propto \frac{1}{m}`,
      ],
      [
        T`Both results are true at once, so the acceleration is proportional to the force divided by the mass.`,
        T`a \propto \frac{F}{m}`,
      ],
      [
        T`"Proportional to" becomes "equals" when multiplied by some fixed number. The newton is defined so that this number is exactly 1: one newton is the force that gives one kilogram an acceleration of one metre per second every second. With that choice of unit:`,
        T`a = \frac{F}{m}`,
      ],
      [
        T`Multiply both sides by $m$ to remove the division, and write the force first.`,
        T`F = ma`,
      ],
      [
        T`$F$ here is the net force. If a 10 N push to the right is opposed by 4 N of friction to the left, the net force is 6 N to the right, and it is that 6 N which goes into the equation. The acceleration is always in the direction of the net force.`,
        T`F_{net} = ma`,
      ],
    ],
  },
  weight: {
    about: T`Weight is the force of gravity on an object. It is measured in newtons, and it is not the same thing as mass: mass (in kilograms) is how much matter there is and is the same everywhere, while weight depends on how strong gravity is where the object happens to be. A 10 kg bag weighs about 98 N on the Earth and about 16 N on the Moon. The quantity $g$ is the gravitational field strength: the force on each kilogram.`,
    idea: T`Apply Newton's second law to an object in free fall, where gravity is the only force.`,
    origin: [
      [
        T`Start from Newton's second law: the net force on an object equals its mass times its acceleration.`,
        T`F = ma`,
      ],
      [
        T`Drop an object where there is no air to get in the way. Experiments going back to Galileo show that every object, heavy or light, then falls with the same acceleration. Near the Earth's surface it is about 9.81 m/s², and it is given the symbol $g$.`,
        T`a = g`,
      ],
      [
        T`While it falls freely, the only force on the object is gravity, so the net force $F$ is its weight $W$. Write $W$ in place of $F$ and $g$ in place of $a$ in Newton's second law.`,
        T`W = mg`,
      ],
      [
        T`Gravity pulls just as hard on an object sitting on a table as on one that is falling. On the table the weight is still $mg$; the object does not accelerate only because the table pushes up with an equal force.`,
        T`W = mg \quad \text{(falling or not)}`,
      ],
      [
        T`Divide both sides by $m$ to see another meaning of $g$: it is the weight of each kilogram. That is why $g$ can be quoted as 9.81 N/kg as well as 9.81 m/s². The two units are the same thing.`,
        T`g = \frac{W}{m}`,
      ],
    ],
  },
  friction: {
    about: T`Friction is the force that opposes one surface sliding over another. This equation gives its size for surfaces that are already sliding: it depends on how hard the surfaces are pressed together (the normal force) and on how rough or grippy the pair of surfaces is (the coefficient of friction, $\mu$). Perhaps surprisingly, it does not depend on the area in contact or on how fast the surfaces slide.`,
    idea: T`Like Newton's second law, this is a summary of measurements rather than something derived.`,
    origin: [
      [
        T`Drag a block across a table with a spring balance, then put a second identical block on top and drag again. The force needed doubles. The surfaces are being pressed together twice as hard, and the friction is twice as large: friction is proportional to the force pressing the surfaces together.`,
        T`F_f \propto N`,
      ],
      [
        T`That pressing force is called the normal force, $N$. "Normal" here means "at right angles": it is the push of the surface on the object, at right angles to the surface.`,
        T`N = \text{push of the surface, at right angles to it}`,
      ],
      [
        T`A proportion becomes an equation when it is multiplied by a fixed number. That number is called the coefficient of friction and written $\mu$ (the Greek letter mu). Rubber on dry road has a large $\mu$ (about 0.8); steel on ice has a small one (about 0.03).`,
        T`F_f = \mu N`,
      ],
      [
        T`Dividing both sides by $N$ shows that $\mu$ is one force divided by another. The newtons cancel, so $\mu$ is a plain number with no unit.`,
        T`\mu = \frac{F_f}{N}`,
      ],
      [
        T`On level ground with nothing else pushing down or lifting up, the object does not move vertically, so the upward normal force must balance the weight.`,
        T`N = mg \quad \text{(level ground)}`,
      ],
      [
        T`Friction always acts along the surface, in the direction that opposes the sliding. This equation is for sliding; an object at rest is held by a friction force that is only as large as it needs to be, up to a limit.`,
        T`F_f = \mu N \quad \text{(while sliding)}`,
      ],
    ],
  },
  "hookes-law": {
    about: T`Hooke's law describes springs and other stretchy things: the force needed to stretch a spring is proportional to how far it is stretched. Double the force and the extension doubles. The spring constant $k$ says how stiff the spring is: a large $k$ means a lot of force for a small stretch. The law holds only up to a point; stretch a spring too far and it deforms permanently.`,
    idea: T`This is an experimental law: hang weights on a spring, measure, and describe the pattern.`,
    origin: [
      [
        T`Hang a 1 N weight on a spring and measure how much longer it gets. Add a second 1 N weight: it stretches by the same amount again. Each equal step in force gives an equal step in extension, so force and extension are proportional.`,
        T`F \propto x`,
      ],
      [
        T`$x$ is the extension, not the length. It is the stretched length minus the length the spring has with nothing pulling on it (its natural length).`,
        T`x = \text{stretched length} - \text{natural length}`,
      ],
      [
        T`A proportion becomes an equation when multiplied by a fixed number. For a spring this is the spring constant $k$.`,
        T`F = kx`,
      ],
      [
        T`Divide both sides by $x$ to see what $k$ means: it is the force needed for each metre of extension, in newtons per metre. A stiff car suspension spring might be 20 000 N/m; a soft toy spring about 1 N/m.`,
        T`k = \frac{F}{x}`,
      ],
      [
        T`The same equation works for squashing a spring, with $x$ the amount it is shortened. In both cases the spring pulls or pushes back towards its natural length.`,
        T`F = kx \quad \text{(stretched or compressed)}`,
      ],
      [
        T`The straight-line pattern stops at the limit of proportionality. Beyond that the spring stretches more easily and may not return to its natural length, and the equation no longer applies.`,
        T`F = kx \quad \text{(up to the limit of proportionality)}`,
      ],
    ],
  },
  torque: {
    about: T`Torque (also called the moment of a force) is the turning effect of a force about a pivot. It explains why a long spanner undoes a tight nut more easily than a short one, and why a door handle is placed far from the hinge. The turning effect depends on three things: how big the force is, how far from the pivot it acts, and the angle at which it pushes.`,
    idea: T`A force turns something most effectively when it pushes at right angles to the line from the pivot. For any other angle, use only the part of the force that is at right angles.`,
    origin: [
      [
        T`Try opening a door by pushing near the hinge, then at the handle. The same push turns the door far more easily at the handle. Experiments show the turning effect is the force multiplied by its distance from the pivot, when the push is at right angles to the door.`,
        T`\tau = rF \quad (\text{force at } 90^\circ)`,
      ],
      [
        T`Now push at an angle. Any force can be thought of as two pushes added together: one along the line from the pivot, and one at right angles to it. Drawing the force as the long side of a right-angled triangle, the side at right angles to $r$ is opposite the angle $\theta$, so by trigonometry its size is $F\sin\theta$.`,
        T`F_{\perp} = F\sin\theta`,
      ],
      [
        T`The part along the line from the pivot just pulls or pushes straight at the hinge. It cannot turn anything, like pulling a door straight outwards along its own surface.`,
        T`F_{\parallel} = F\cos\theta \quad \text{(turns nothing)}`,
      ],
      [
        T`So only the part at right angles produces a turning effect. Use $F\sin\theta$ in place of $F$ in the first line.`,
        T`\tau = r \times F\sin\theta`,
      ],
      [
        T`Written in the usual order:`,
        T`\tau = rF\sin\theta`,
      ],
      [
        T`Check it against experience. At $90^\circ$, $\sin\theta = 1$ and the torque is the full $rF$. At $0^\circ$ (pushing straight at the pivot), $\sin\theta = 0$ and there is no turning effect at all.`,
        T`\sin 90^\circ = 1, \qquad \sin 0^\circ = 0`,
      ],
    ],
  },
  momentum: {
    about: T`Momentum is mass multiplied by velocity. It measures "how much motion" an object has: a slow lorry and a fast cricket ball can both be hard to stop, one because of its mass and the other because of its speed. Momentum matters because the total momentum of objects that collide or push apart stays the same, provided nothing outside pushes on them. Momentum has a direction, the same as the velocity.`,
    idea: T`Momentum is a definition, chosen because this particular combination of mass and velocity turns out to be conserved.`,
    origin: [
      [
        T`How hard it is to stop something depends on how massive it is and on how fast it is going. Momentum is defined as the product of the two, and given the symbol $p$.`,
        T`p = mv`,
      ],
      [
        T`Why multiply, rather than add or do something else? Because experiments on collisions show that the total of mass times velocity for all the objects is the same after a collision as before it. No other simple combination has that property.`,
        T`\text{total } mv \text{ before} = \text{total } mv \text{ after}`,
      ],
      [
        T`Velocity has a direction, so momentum does too. Choose one direction as positive; an object moving the other way then has a negative velocity and so a negative momentum.`,
        T`p = m \times (-v) = -mv`,
      ],
      [
        T`The unit comes straight from the multiplication: kilograms times metres per second.`,
        T`\text{kg} \times \text{m/s} = \text{kg m/s}`,
      ],
    ],
  },
  impulse: {
    about: T`This equation says how a force changes an object's motion when it acts for a certain time. The force multiplied by the time it acts is called the impulse, and it equals the change in the object's momentum. It explains why following through makes a ball go faster (the force acts for longer) and why airbags and crumple zones save lives (they make the stopping take longer, so the force is smaller).`,
    idea: T`Start from Newton's second law and write the acceleration as change in velocity divided by time.`,
    origin: [
      [
        T`Start from Newton's second law: net force equals mass times acceleration.`,
        T`F = ma`,
      ],
      [
        T`Acceleration is the change in velocity divided by the time the change takes. The symbol $\Delta$ (delta) means "change in", so the change in velocity is written $\Delta v$ and the time it takes is $\Delta t$.`,
        T`a = \frac{\Delta v}{\Delta t}`,
      ],
      [
        T`Since $a$ and $\frac{\Delta v}{\Delta t}$ are the same thing, write the fraction in place of $a$ in Newton's second law.`,
        T`F = m \times \frac{\Delta v}{\Delta t}`,
      ],
      [
        T`Multiply both sides by $\Delta t$ to remove the division. On the right, the $\Delta t$ on top cancels the one underneath.`,
        T`F\Delta t = m\Delta v`,
      ],
      [
        T`The left side, force times time, is called the impulse. The right side is the change in momentum: the momentum goes from $m \times (\text{old } v)$ to $m \times (\text{new } v)$, and if the mass does not change, the difference is $m$ times the change in $v$.`,
        T`\text{impulse} = \text{change in momentum}`,
      ],
      [
        T`Divide both sides by $\Delta t$ to see the safety lesson. For a given change in momentum (say, stopping a passenger), a longer time on the bottom of the fraction means a smaller force.`,
        T`F = \frac{m\Delta v}{\Delta t}`,
      ],
    ],
  },
  "work-done": {
    about: T`In physics, work is done whenever a force moves something, and it is the amount of energy transferred by that force. Lifting a box, pushing a trolley and stretching a spring all involve work. If the force is not in line with the movement, only the part of the force that points along the movement counts. Work is measured in joules: one joule is one newton moving something one metre.`,
    idea: T`For a force in line with the motion, work is force times distance. For a force at an angle, use only the part of the force that points along the motion.`,
    origin: [
      [
        T`Work is defined as the force multiplied by the distance moved in the direction of the force. Push with 10 N along a 3 m floor and you do 30 J of work.`,
        T`W = Fs \quad (\text{force along the motion})`,
      ],
      [
        T`Now suppose the force is at an angle $\theta$ to the motion, like pulling a sledge with a rope that slopes upwards. Any force can be treated as two forces added together: one along the motion and one at right angles to it. Drawing the force as the long side of a right-angled triangle, the side next to the angle $\theta$ is the part along the motion, and trigonometry gives its size as $F\cos\theta$.`,
        T`F_{\parallel} = F\cos\theta`,
      ],
      [
        T`The other part, at right angles to the motion, is $F\sin\theta$. The object does not move at all in that direction, so that part moves it through zero distance and does zero work.`,
        T`F_{\perp} \times 0 = 0`,
      ],
      [
        T`So all the work is done by the part along the motion. Use $F\cos\theta$ in place of $F$ in the first line.`,
        T`W = F\cos\theta \times s`,
      ],
      [
        T`Written in the usual order:`,
        T`W = Fs\cos\theta`,
      ],
      [
        T`Check the special cases. At $0^\circ$, $\cos\theta = 1$ and we are back to $W = Fs$. At $90^\circ$, $\cos\theta = 0$: a force at right angles to the motion does no work, which is why carrying a bag along level ground does no work on the bag. Beyond $90^\circ$ the cosine is negative: a force that opposes the motion takes energy away.`,
        T`\cos 0^\circ = 1, \qquad \cos 90^\circ = 0`,
      ],
    ],
  },
  "kinetic-energy": {
    about: T`Kinetic energy is the energy an object has because it is moving. It depends on the mass and, much more strongly, on the speed: because the speed is squared, doubling the speed gives four times the kinetic energy. That is why a car's braking distance goes up so sharply with speed, and why a small increase in speed makes a crash much more serious.`,
    idea: T`The kinetic energy of a moving object is equal to the work that had to be done to get it moving from rest. Work that out using Newton's second law and an equation of motion.`,
    origin: [
      [
        T`Energy is transferred to an object by doing work on it. So the kinetic energy of an object moving at speed $v$ equals the work done by the force that got it up to that speed from rest. Work is force times distance.`,
        T`E_k = Fs`,
      ],
      [
        T`Newton's second law says the force is the mass times the acceleration it produces. Because $F$ and $ma$ are equal, write $ma$ in place of $F$.`,
        T`E_k = ma \times s`,
      ],
      [
        T`We need to get rid of $a$ and $s$, because the answer should depend only on the mass and the speed. The equation of motion $v^2 = u^2 + 2as$ links them to the speed. The object starts from rest, so $u = 0$ and $u^2 = 0$.`,
        T`v^2 = 2as`,
      ],
      [
        T`Divide both sides by 2 to find what the product $as$ is equal to.`,
        T`as = \frac{v^2}{2}`,
      ],
      [
        T`In the second line, $ma \times s$ is the same as $m \times as$ (the order of multiplying does not matter). We have just shown that $as$ equals $\frac{v^2}{2}$, so write that in its place.`,
        T`E_k = m \times \frac{v^2}{2}`,
      ],
      [
        T`Dividing by 2 is the same as multiplying by a half, which gives the usual form.`,
        T`E_k = \tfrac{1}{2}mv^2`,
      ],
      [
        T`Notice that the force and the distance have disappeared. It does not matter whether the object was pushed hard over a short distance or gently over a long one: the kinetic energy depends only on its mass and its speed now.`,
        T`E_k = \tfrac{1}{2}mv^2`,
      ],
    ],
  },
  "gravitational-potential-energy": {
    about: T`Gravitational potential energy is the energy stored when an object is lifted. Lift a book onto a shelf and you have done work against gravity; that energy is stored, and the book can get it back as kinetic energy by falling. Near the ground the energy stored depends on the mass, the strength of gravity and the height gained. Only changes in height matter, so you are free to choose where to call the height zero.`,
    idea: T`The energy stored by lifting equals the work done in lifting: force times distance, where the force is the weight and the distance is the height.`,
    origin: [
      [
        T`The energy stored when an object is lifted equals the work done on it by whatever lifts it. Work is force times distance moved in the direction of the force.`,
        T`E_p = Fs`,
      ],
      [
        T`To lift something at a steady speed, the upward force must exactly balance its weight. (A bigger force would also speed it up, giving it kinetic energy as well.) The weight of a mass $m$ is $mg$.`,
        T`F = mg`,
      ],
      [
        T`The distance moved in the direction of the force is the vertical height gained, $h$.`,
        T`s = h`,
      ],
      [
        T`Write $mg$ in place of $F$, and $h$ in place of $s$, in the first line.`,
        T`E_p = mg \times h`,
      ],
      [
        T`Written without the multiplication sign:`,
        T`E_p = mgh`,
      ],
      [
        T`Only the vertical height matters, not the route. Carrying a box up a long ramp or lifting it straight up to the same shelf stores the same energy, because the weight acts vertically and sideways movement does no work against it.`,
        T`E_p = mgh \quad (h \text{ measured vertically})`,
      ],
      [
        T`The working assumed $g$ is the same all the way up, which is true to within 1% for heights up to about 30 km above the Earth. For satellites and planets, where $g$ changes a lot with distance, use $E_p = -\frac{GMm}{r}$ instead.`,
        T`E_p = mgh \quad \text{(near the surface)}`,
      ],
    ],
  },
  "elastic-potential-energy": {
    about: T`A stretched or squashed spring stores energy, which it gives back when released: this is what drives a wind-up toy, a trampoline or a bow and arrow. The energy stored depends on the stiffness of the spring and on the square of the extension, so stretching a spring twice as far stores four times as much energy.`,
    idea: T`The energy stored equals the work done in stretching the spring. The force is not constant while stretching, so use the average force.`,
    origin: [
      [
        T`The energy stored in the spring equals the work done in stretching it. Work is force times distance.`,
        T`E_s = \text{force} \times \text{distance}`,
      ],
      [
        T`But which force? By Hooke's law the force needed grows as the spring stretches. It is zero at the start (no extension) and reaches $kx$ when the extension is $x$.`,
        T`F = kx \quad \text{(at the end)}`,
      ],
      [
        T`Because Hooke's law is a straight-line relationship, the force rises evenly from $0$ to $kx$. The average of something that rises evenly is halfway between where it starts and where it finishes.`,
        T`F_{av} = \frac{0 + kx}{2}`,
      ],
      [
        T`Adding zero changes nothing, and dividing by 2 is the same as multiplying by a half.`,
        T`F_{av} = \tfrac{1}{2}kx`,
      ],
      [
        T`The work done is this average force times the distance over which it acted. The distance is the extension, $x$.`,
        T`E_s = \tfrac{1}{2}kx \times x`,
      ],
      [
        T`$x \times x$ is written $x^2$.`,
        T`E_s = \tfrac{1}{2}kx^2`,
      ],
      [
        T`There is a picture of this too. On a graph of force against extension, the work done is the area under the line. The line goes straight from the origin up to the point $(x, kx)$, so the area is a triangle: half its base times its height.`,
        T`\text{area} = \tfrac{1}{2} \times x \times kx = \tfrac{1}{2}kx^2`,
      ],
    ],
  },
  "power-work-time": {
    about: T`Power is how quickly work is done, or how quickly energy is transferred. Two people who climb the same stairs do the same work if they weigh the same, but the one who runs up develops more power because the work is done in less time. Power is measured in watts: one watt is one joule every second. A kettle is about 2000 W; a person climbing stairs manages a few hundred.`,
    idea: T`Power means work done in each second, so share the work equally among the seconds.`,
    origin: [
      [
        T`Power tells you how much work is done in each second. If an amount of work $W$ is done in a time $t$, share the work equally among the seconds. Sharing equally is dividing.`,
        T`P = \frac{W}{t}`,
      ],
      [
        T`The unit follows from the division: joules divided by seconds. One joule per second is given its own name, the watt.`,
        T`1\,\text{W} = 1\,\text{J/s}`,
      ],
      [
        T`Check that the equation behaves sensibly. Do the same work in half the time and the bottom of the fraction halves, which doubles the power.`,
        T`\frac{W}{t/2} = \frac{2W}{t} = 2P`,
      ],
      [
        T`To find the work done by something of known power, undo the division by multiplying both sides by $t$. A 2000 W kettle running for 60 s transfers 120 000 J.`,
        T`W = Pt`,
      ],
    ],
  },
  "power-force-velocity": {
    about: T`This equation gives the power being delivered by a force that keeps something moving: the force multiplied by the velocity. It is the natural form for engines and motors. It explains why a car needs much more power to hold a high speed (the drag force is bigger and so is the speed) and why a cyclist changes to a low gear on a hill: for the same power, less speed means more force.`,
    idea: T`Power is work divided by time; work is force times distance; and distance divided by time is velocity.`,
    origin: [
      [
        T`Power is the work done divided by the time taken.`,
        T`P = \frac{W}{t}`,
      ],
      [
        T`For a force that points along the direction of motion, the work done is the force times the distance moved. Since $W$ and $Fs$ are equal, write $Fs$ in place of $W$.`,
        T`P = \frac{Fs}{t}`,
      ],
      [
        T`A fraction with a product on top can be split up: $\frac{Fs}{t}$ is the same as $F$ multiplied by $\frac{s}{t}$. (For example, $\frac{3 \times 8}{4} = 3 \times \frac{8}{4}$.)`,
        T`P = F \times \frac{s}{t}`,
      ],
      [
        T`Distance divided by time is the velocity. Since $\frac{s}{t}$ and $v$ are the same thing, write $v$ in its place.`,
        T`P = Fv`,
      ],
      [
        T`This gives the power at one moment, even if the velocity is changing. At a steady velocity the driving force equals the resistive forces, so $P = Fv$ then gives the power needed just to overcome drag and friction.`,
        T`P = Fv \quad (F \text{ along the motion})`,
      ],
    ],
  },
};
