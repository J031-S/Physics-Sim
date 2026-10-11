// "What it is about" and "Where it comes from" for the minitools on waves,
// light, quanta and relativity. No DOM. The conventions are described at the
// top of origins-mechanics.js.

const T = String.raw;

export const waves = {
  "wave-equation": {
    about: T`Every wave, whether sound, light, a ripple on water or a pulse on a rope, obeys the same simple rule: its speed equals its frequency multiplied by its wavelength. The frequency is how many complete waves pass a point each second, and the wavelength is the length of one complete wave. In a given material the speed is fixed, so a higher frequency always means a shorter wavelength.`,
    idea: T`Speed is distance divided by time. In the time of one cycle, a wave moves forward by one wavelength.`,
    origin: [
      [
        T`Speed is the distance travelled divided by the time taken.`,
        T`v = \frac{\text{distance}}{\text{time}}`,
      ],
      [
        T`Watch one crest. In the time it takes for one complete wave to pass a fixed point, the crest has moved forward by exactly the length of one wave. That length is the wavelength $\lambda$ (lambda), and that time is the period $T$.`,
        T`\text{distance} = \lambda, \qquad \text{time} = T`,
      ],
      [
        T`Write these in place of "distance" and "time" in the first line.`,
        T`v = \frac{\lambda}{T}`,
      ],
      [
        T`The frequency $f$ is the number of waves passing each second. If 5 waves pass each second, each one takes a fifth of a second. In general each wave takes $\frac{1}{f}$ seconds.`,
        T`T = \frac{1}{f}`,
      ],
      [
        T`Since $T$ and $\frac{1}{f}$ are the same, write $\frac{1}{f}$ in place of $T$.`,
        T`v = \lambda \div \frac{1}{f}`,
      ],
      [
        T`Dividing by a fraction is the same as multiplying by that fraction turned upside down, and $\frac{1}{f}$ upside down is $f$.`,
        T`v = \lambda \times f`,
      ],
      [
        T`Written in the usual order:`,
        T`v = f\lambda`,
      ],
      [
        T`Another way to see it: $f$ waves pass each second and each is $\lambda$ long, so a length $f \times \lambda$ of wave passes each second. That is the speed.`,
        T`v = f\lambda`,
      ],
    ],
  },
  "period-frequency": {
    about: T`Anything that repeats (a wave, a swing, a spinning wheel, a heartbeat) can be described in two ways: by how long one cycle takes, called the period, or by how many cycles happen each second, called the frequency. They are two views of the same information, and each is "one over" the other. Frequency is measured in hertz: 1 Hz is one cycle per second.`,
    idea: T`Frequency is cycles divided by time. Apply that to exactly one cycle.`,
    origin: [
      [
        T`Frequency is the number of complete cycles divided by the time they take.`,
        T`f = \frac{\text{number of cycles}}{\text{time taken}}`,
      ],
      [
        T`Apply this to exactly one cycle. The number of cycles is 1, and the time one cycle takes is by definition the period, $T$.`,
        T`f = \frac{1}{T}`,
      ],
      [
        T`To make $T$ the subject, first multiply both sides by $T$. On the right, the $T$ cancels.`,
        T`fT = 1`,
      ],
      [
        T`Now $T$ is multiplied by $f$. Divide both sides by $f$.`,
        T`T = \frac{1}{f}`,
      ],
      [
        T`A check with numbers: mains electricity in Australia and Europe is 50 Hz, 50 cycles each second. Each cycle therefore lasts one fiftieth of a second.`,
        T`T = \frac{1}{50\,\text{Hz}} = 0.02\,\text{s}`,
      ],
    ],
  },
  "snells-law": {
    about: T`Light changes direction when it passes from one transparent material into another, such as from air into water. This bending, called refraction, is why a straw looks bent in a glass and how lenses focus. Snell's law tells you the new direction. Each material has a refractive index, $n$, which says how much it slows light down: about 1.00 for air, 1.33 for water and 1.5 for glass. Going into a material with a higher index, light bends towards the normal; going into a lower index, away from it.`,
    idea: T`Light bends because it travels at different speeds in the two materials. Follow one wavefront as it crosses the boundary.`,
    origin: [
      [
        T`Light travels more slowly in glass or water than in empty space. The refractive index of a material is defined as the speed of light in a vacuum, $c$, divided by its speed $v$ in the material. Glass with $n = 1.5$ slows light to two thirds of $c$.`,
        T`n = \frac{c}{v}`,
      ],
      [
        T`Angles are measured from the normal, an imaginary line at right angles to the surface. $\theta_1$ is the angle of the incoming ray and $\theta_2$ the angle of the ray after it has crossed.`,
        T`\theta = \text{angle between the ray and the normal}`,
      ],
      [
        T`Picture a wavefront (a line of wave crest, at right angles to the ray) arriving at the boundary at a slant. One end reaches the boundary first. While the other end is still travelling in the first material, covering a distance $v_1t$, the first end is already inside the second material, covering $v_2t$. Because the two ends travel different distances, the wavefront swings round to a new direction.`,
        T`\text{distances travelled in the same time: } v_1t \text{ and } v_2t`,
      ],
      [
        T`The stretch of boundary between the two ends, of length $d$, is the long side of two right-angled triangles, one on each side of the boundary. In the first, the side opposite $\theta_1$ is $v_1t$; in the second, the side opposite $\theta_2$ is $v_2t$. Sine is opposite divided by the long side.`,
        T`\sin\theta_1 = \frac{v_1t}{d}, \qquad \sin\theta_2 = \frac{v_2t}{d}`,
      ],
      [
        T`Divide the first of these by the second. The $t$ and the $d$ appear in both and cancel.`,
        T`\frac{\sin\theta_1}{\sin\theta_2} = \frac{v_1}{v_2}`,
      ],
      [
        T`From the first line, multiplying both sides by $v$ and dividing by $n$ gives the speed in each material as $v = \frac{c}{n}$. Write $\frac{c}{n_1}$ in place of $v_1$ and $\frac{c}{n_2}$ in place of $v_2$.`,
        T`\frac{\sin\theta_1}{\sin\theta_2} = \frac{c/n_1}{c/n_2}`,
      ],
      [
        T`Dividing by $\frac{c}{n_2}$ is the same as multiplying by $\frac{n_2}{c}$. The $c$'s cancel, and notice that the indices end up the other way up from the speeds.`,
        T`\frac{\sin\theta_1}{\sin\theta_2} = \frac{n_2}{n_1}`,
      ],
      [
        T`Multiply both sides by $\sin\theta_2$ and by $n_1$ to remove both divisions.`,
        T`n_1\sin\theta_1 = n_2\sin\theta_2`,
      ],
      [
        T`Going from a high index to a low one (glass to air), $\sin\theta_2$ works out bigger than $\sin\theta_1$. If it would have to be bigger than 1, which no sine can be, there is no refracted ray: all the light is reflected back. This is total internal reflection, used in optical fibres.`,
        T`\frac{n_1}{n_2}\sin\theta_1 > 1 \;\Rightarrow\; \text{total internal reflection}`,
      ],
    ],
  },
  "standing-waves": {
    about: T`A guitar string, fixed at both ends, cannot vibrate at just any frequency. Only certain patterns fit, each with a whole number of "loops" between the ends. These patterns are called standing waves because they do not appear to travel along the string. The lowest frequency (one loop) is the fundamental, the note you hear; the others are its harmonics. The equation shows why a shorter or tighter string gives a higher note.`,
    idea: T`The ends cannot move, so a whole number of half-wavelengths must fit into the string. That fixes the wavelength, and the wave equation then gives the frequency.`,
    origin: [
      [
        T`The string is held at both ends, so those two points cannot move. A point on a standing wave that never moves is called a node. So there must be a node at each end.`,
        T`\text{node at each end}`,
      ],
      [
        T`In any standing wave the nodes are half a wavelength apart: each "loop" between two neighbouring nodes is half a wave. So the string must hold a whole number of loops. Call that number $n$. Then $n$ half-wavelengths make up the length $L$.`,
        T`L = n \times \frac{\lambda}{2}`,
      ],
      [
        T`Make the wavelength the subject. First multiply both sides by 2 to remove the division by 2.`,
        T`2L = n\lambda`,
      ],
      [
        T`Then divide both sides by $n$.`,
        T`\lambda = \frac{2L}{n}`,
      ],
      [
        T`The wave equation $v = f\lambda$ links wavelength to frequency, where $v$ is the speed of waves along the string. Divide both sides by $\lambda$ to make $f$ the subject.`,
        T`f = \frac{v}{\lambda}`,
      ],
      [
        T`We found $\lambda = \frac{2L}{n}$, so write that in place of $\lambda$.`,
        T`f = v \div \frac{2L}{n}`,
      ],
      [
        T`Dividing by a fraction is the same as multiplying by it turned upside down.`,
        T`f = v \times \frac{n}{2L}`,
      ],
      [
        T`Written as one fraction, with a subscript $n$ on the frequency to show which pattern it belongs to:`,
        T`f_n = \frac{nv}{2L}`,
      ],
      [
        T`With $n = 1$ this is the fundamental, $f_1 = \frac{v}{2L}$. Every other allowed frequency is a whole number times that, which is why the harmonics of a string sound pleasant together.`,
        T`f_n = n \times f_1`,
      ],
    ],
  },
  "inverse-square-intensity": {
    about: T`The further you are from a lamp, a loudspeaker or a star, the weaker its light or sound. This equation says by how much. Intensity is the power arriving on each square metre. For a source that sends its energy out equally in all directions, the intensity falls with the square of the distance: twice as far away, only a quarter as much reaches each square metre.`,
    idea: T`The same power is spread over a bigger and bigger sphere as it travels outwards. Divide the power by the area of the sphere.`,
    origin: [
      [
        T`Intensity is defined as the power arriving on each square metre of a surface facing the source. Share the power among the square metres it falls on.`,
        T`I = \frac{\text{power}}{\text{area}}`,
      ],
      [
        T`Suppose a small source gives out a power $P$ equally in every direction, and nothing absorbs it on the way. Imagine a sphere of radius $r$ centred on the source. All of the power $P$ passes through the surface of that sphere, spread evenly over it.`,
        T`\text{power through the sphere} = P`,
      ],
      [
        T`Geometry gives the surface area of a sphere of radius $r$.`,
        T`\text{area of a sphere} = 4\pi r^2`,
      ],
      [
        T`Write $P$ in place of "power" and $4\pi r^2$ in place of "area" in the first line.`,
        T`I = \frac{P}{4\pi r^2}`,
      ],
      [
        T`Now double the distance. The radius becomes $2r$, and squaring it gives $(2r)^2 = 2r \times 2r = 4r^2$: the sphere has four times the area. The same power spread over four times the area gives a quarter of the intensity.`,
        T`\frac{P}{4\pi (2r)^2} = \frac{P}{4 \times 4\pi r^2} = \frac{1}{4} \times \frac{P}{4\pi r^2}`,
      ],
      [
        T`This does not apply to a laser or a torch with a reflector, which send their power in a narrow beam rather than in all directions.`,
        T`I = \frac{P}{4\pi r^2} \quad \text{(source radiating equally in all directions)}`,
      ],
    ],
  },
  "photon-energy": {
    about: T`Light is not delivered as a smooth, continuous flow. It arrives in separate packets of energy called photons. This equation gives the energy of one photon: it depends only on the frequency (the colour) of the light. Blue light has a higher frequency than red, so each blue photon carries more energy. Brighter light of the same colour simply has more photons, not bigger ones. This idea started quantum physics.`,
    idea: T`This is a discovery about nature, made by Planck and Einstein in the early 1900s to explain experiments that wave theory could not.`,
    origin: [
      [
        T`By 1900 two experiments could not be explained if light were only a smooth wave: the colours of light given off by hot objects, and the photoelectric effect (light knocking electrons out of a metal). Max Planck, and then Albert Einstein, showed that both make sense if light of frequency $f$ can only give up its energy in whole packets.`,
        T`\text{light energy comes in packets (photons)}`,
      ],
      [
        T`The experiments show that the energy of each packet is proportional to the frequency of the light: double the frequency and each packet has double the energy. (The sign $\propto$ means "is proportional to".)`,
        T`E \propto f`,
      ],
      [
        T`A proportion becomes an equation when multiplied by a fixed number. This one is the Planck constant, $h$. It is extremely small, which is why we never notice individual photons in everyday life.`,
        T`E = hf`,
      ],
      [
        T`This is the energy of one photon. A beam of light with $N$ photons carries $N$ times as much. Making a lamp brighter increases $N$; only changing the colour changes the energy of each photon.`,
        T`E_{\text{beam}} = N \times hf`,
      ],
      [
        T`Often the wavelength is known instead of the frequency. The wave equation for light is $c = f\lambda$; dividing both sides by $\lambda$ gives $f = \frac{c}{\lambda}$. Write that in place of $f$.`,
        T`E = \frac{hc}{\lambda}`,
      ],
    ],
  },
  "photoelectric-effect": {
    about: T`Shine light on a clean metal surface and electrons can be knocked out of it. This is the photoelectric effect, used in light sensors and solar cells. Its strange feature is that the colour of the light matters more than its brightness: dim blue light can free electrons when bright red light cannot. Einstein explained this by treating light as photons, each of which gives all its energy to a single electron. The equation is simply energy bookkeeping for that one electron.`,
    idea: T`One photon gives its energy to one electron. Some of that energy is used up escaping from the metal; what is left over is the electron's kinetic energy.`,
    origin: [
      [
        T`Light of frequency $f$ arrives as photons, each with energy $hf$. When a photon is absorbed by an electron in the metal, the electron gets all of that energy at once. Two photons cannot club together.`,
        T`\text{energy the electron receives} = hf`,
      ],
      [
        T`Electrons are held in the metal by the attraction of its positive ions, so escaping costs energy. The smallest possible cost, for an electron right at the surface, is called the work function, $W$. It is different for each metal.`,
        T`\text{least energy needed to escape} = W`,
      ],
      [
        T`Energy is conserved: what goes in must equal what comes out. The energy in is the photon's. It comes out as the cost of escaping plus whatever kinetic energy the electron has left once it is free.`,
        T`hf = W + E_k`,
      ],
      [
        T`To make $E_k$ the subject, subtract $W$ from both sides.`,
        T`hf - W = E_k`,
      ],
      [
        T`Write it with $E_k$ on the left.`,
        T`E_k = hf - W`,
      ],
      [
        T`This is the largest kinetic energy an electron can have. Electrons that start deeper inside the metal use up more than $W$ on the way out and emerge with less.`,
        T`E_{k,\,\text{max}} = hf - W`,
      ],
      [
        T`If $hf$ is less than $W$, the equation gives a negative kinetic energy, which is impossible. It means the photon cannot pay the cost of escape, so no electrons come out at all, however bright the light. The lowest frequency that works, where $hf$ just equals $W$, is the threshold frequency.`,
        T`f_0 = \frac{W}{h}`,
      ],
    ],
  },
  "de-broglie": {
    about: T`Light, long thought to be a wave, also behaves as particles (photons). In 1924 Louis de Broglie suggested the reverse might be true as well: particles such as electrons might also behave as waves. He was right. Every moving object has a wavelength, given by this equation. For everyday objects it is far too small ever to notice, but for electrons it is about the size of an atom, which is what makes electron microscopes possible.`,
    idea: T`Find how a photon's wavelength is related to its momentum, then propose that the same relationship holds for matter.`,
    origin: [
      [
        T`Start with light, where we know both pictures. A photon of frequency $f$ has energy:`,
        T`E = hf`,
      ],
      [
        T`Light also carries momentum, which is why sunlight pushes very gently on a comet's tail. Relativity shows that for a photon the momentum is its energy divided by the speed of light. We take this result on trust.`,
        T`p = \frac{E}{c}`,
      ],
      [
        T`Since $E$ and $hf$ are equal, write $hf$ in place of $E$.`,
        T`p = \frac{hf}{c}`,
      ],
      [
        T`We want the wavelength rather than the frequency. The wave equation for light is $c = f\lambda$. Divide both sides by $c$, and then by $\lambda$:`,
        T`\frac{1}{\lambda} = \frac{f}{c}`,
      ],
      [
        T`The momentum is $h \times \frac{f}{c}$, and we have just shown that $\frac{f}{c}$ equals $\frac{1}{\lambda}$. Write $\frac{1}{\lambda}$ in its place.`,
        T`p = \frac{h}{\lambda}`,
      ],
      [
        T`Make $\lambda$ the subject: multiply both sides by $\lambda$, which gives $p\lambda = h$, then divide both sides by $p$.`,
        T`\lambda = \frac{h}{p}`,
      ],
      [
        T`So far this is about photons. De Broglie's bold proposal was that exactly the same equation gives the wavelength of any particle of matter, with $p$ its ordinary momentum, $mv$.`,
        T`\lambda = \frac{h}{mv}`,
      ],
      [
        T`Three years later, experiments fired electrons at crystals and found them spreading out into a pattern of bright and dark bands, just as waves do, with exactly the wavelength this equation predicts.`,
        T`\lambda = \frac{h}{p} \quad \text{(confirmed by electron diffraction)}`,
      ],
    ],
  },
  "mass-energy": {
    about: T`Einstein's most famous equation says that mass and energy are two forms of the same thing, and gives the exchange rate between them. Because the speed of light squared is a huge number, a tiny amount of mass corresponds to an enormous amount of energy. This is where the energy of nuclear power stations and of the Sun comes from: in nuclear reactions a small fraction of the mass disappears and reappears as energy.`,
    idea: T`The equation comes from Einstein's special theory of relativity. The full derivation needs more mathematics than this course has, so the steps below explain what it says and why it is believable.`,
    origin: [
      [
        T`Special relativity starts from one experimental fact: the speed of light is the same for every observer. Working out the consequences, Einstein found that an object has energy simply because it has mass, even when it is not moving. This "rest energy" is proportional to the mass.`,
        T`E \propto m`,
      ],
      [
        T`The fixed number that turns the proportion into an equation turns out to be the speed of light multiplied by itself. We take that result on trust.`,
        T`E = mc^2`,
      ],
      [
        T`The units at least fit. Kinetic energy is $\tfrac{1}{2}mv^2$: a mass times a speed squared, measured in joules. $mc^2$ is also a mass times a speed squared, so it is an energy in joules too.`,
        T`\text{kg} \times (\text{m/s})^2 = \text{J}`,
      ],
      [
        T`Now see how big the exchange rate is. The speed of light is $3.00 \times 10^{8}$ m/s. Squaring it squares the 3.00 and doubles the power of ten.`,
        T`c^2 = (3.00 \times 10^{8})^2 = 9.00 \times 10^{16}\ \text{m}^2/\text{s}^2`,
      ],
      [
        T`So one gram of mass (0.001 kg) corresponds to ninety million million joules, about the energy a large power station produces in a day.`,
        T`E = 0.001 \times 9.00 \times 10^{16} = 9.00 \times 10^{13}\ \text{J}`,
      ],
      [
        T`In practice only a small part of an object's mass is ever converted. In a nuclear reaction the products have slightly less mass than the starting materials. That missing mass, $\Delta m$, has become the energy released.`,
        T`\Delta E = \Delta m \times c^2`,
      ],
    ],
  },
  "time-dilation": {
    about: T`One of the strangest results of Einstein's special relativity is that time does not pass at the same rate for everyone. A clock that is moving relative to you runs slow compared with your own. The effect is far too small to notice at everyday speeds, but it becomes large close to the speed of light, and it is real: fast-moving particles live measurably longer, and satellite navigation has to correct for it. The equation says how much longer each tick of the moving clock takes.`,
    idea: T`Imagine a clock that ticks by bouncing light between two mirrors. Seen moving past, the light has further to go for each tick, yet it still travels at the same speed, so each tick must take longer. Pythagoras' theorem gives the amount.`,
    origin: [
      [
        T`Everything here rests on one experimental fact, which Einstein took as his starting point: light travels at the same speed, $c$, for every observer, however they are moving.`,
        T`\text{speed of light} = c \text{ for everyone}`,
      ],
      [
        T`Build a "light clock": two mirrors a distance $d$ apart, with a pulse of light bouncing between them. One tick is one trip up and back. For someone travelling with the clock, the light goes straight up and down, a distance $2d$. Time is distance divided by speed. This time is called the proper time, $t_0$.`,
        T`t_0 = \frac{2d}{c}`,
      ],
      [
        T`Make $d$ the subject, because we will need it later: multiply both sides by $c$, then divide both sides by 2.`,
        T`d = \frac{ct_0}{2}`,
      ],
      [
        T`Now watch the same clock fly past sideways at speed $v$. Call the time you measure for one tick $t$. During the first half of the tick, which lasts $\frac{t}{2}$, the mirrors move sideways. Distance is speed times time.`,
        T`\text{sideways distance in half a tick} = \frac{vt}{2}`,
      ],
      [
        T`So for you the light does not go straight up: it travels on a slant, to where the top mirror has moved to. Light still moves at $c$ for you (the fact we started with), so in the time $\frac{t}{2}$ the slanting path has length:`,
        T`\text{slanting path} = \frac{ct}{2}`,
      ],
      [
        T`The slanting path, the sideways distance and the mirror gap $d$ form a right-angled triangle, with the slanting path as the longest side. Pythagoras' theorem says the square of the longest side equals the sum of the squares of the other two.`,
        T`\left(\frac{ct}{2}\right)^2 = d^2 + \left(\frac{vt}{2}\right)^2`,
      ],
      [
        T`We showed that $d = \frac{ct_0}{2}$, so write that in place of $d$. (Both observers agree on $d$, because it is at right angles to the motion.) Then square each bracket: squaring a fraction squares everything on the top and the bottom.`,
        T`\frac{c^2t^2}{4} = \frac{c^2t_0^2}{4} + \frac{v^2t^2}{4}`,
      ],
      [
        T`Every term is divided by 4. Multiply both sides by 4 and all the 4's disappear.`,
        T`c^2t^2 = c^2t_0^2 + v^2t^2`,
      ],
      [
        T`We want $t$. It appears in two terms, on opposite sides, so gather them together: subtract $v^2t^2$ from both sides.`,
        T`c^2t^2 - v^2t^2 = c^2t_0^2`,
      ],
      [
        T`Both terms on the left are something multiplied by $t^2$. That can be written as $t^2$ multiplied by a bracket, just as $5 \times 7 - 3 \times 7 = (5 - 3) \times 7$.`,
        T`t^2\,(c^2 - v^2) = c^2t_0^2`,
      ],
      [
        T`Now $t^2$ is multiplied by the bracket. Divide both sides by the bracket.`,
        T`t^2 = \frac{c^2t_0^2}{c^2 - v^2}`,
      ],
      [
        T`Tidy the fraction by dividing its top and its bottom by $c^2$, which does not change its value. On top, $c^2t_0^2 \div c^2 = t_0^2$. On the bottom, $c^2 \div c^2 = 1$ and $v^2 \div c^2 = \frac{v^2}{c^2}$.`,
        T`t^2 = \frac{t_0^2}{1 - v^2/c^2}`,
      ],
      [
        T`Take the square root of both sides. The square root of $t^2$ is $t$, and of $t_0^2$ is $t_0$.`,
        T`t = \frac{t_0}{\sqrt{1 - v^2/c^2}}`,
      ],
      [
        T`For any speed below $c$, the quantity under the square root is less than 1, so $t_0$ is being divided by a number less than 1, which makes it bigger. $t$ is always more than $t_0$: the moving clock takes longer over each tick. As $v$ gets close to $c$ the bottom heads towards zero and $t$ grows without limit, which is one reason nothing can reach the speed of light.`,
        T`v < c \;\Rightarrow\; t > t_0`,
      ],
    ],
  },
  "length-contraction": {
    about: T`Special relativity says that a moving object is measured to be shorter along its direction of motion than when it is at rest. The length measured by someone at rest relative to the object is its proper length; anyone moving relative to it measures less. Like time dilation, the effect is unnoticeable at everyday speeds and dramatic near the speed of light. Lengths at right angles to the motion are not affected.`,
    idea: T`Two observers time the same trip. They agree about their relative speed but, because of time dilation, not about the time, so they cannot agree about the distance either.`,
    origin: [
      [
        T`A spaceship flies at speed $v$ past two posts fixed to the ground. Someone standing by the posts measures the distance between them as $L_0$ (the proper length, since the posts are at rest for them) and times the ship's trip from one post to the other as $t$. Distance is speed times time.`,
        T`L_0 = vt`,
      ],
      [
        T`Now take the view from the ship. The crew see the posts rushing past at the same speed $v$. Both posts pass the same point on the ship, so one clock on board times the whole event. A time measured by a single clock that is present at both events is the proper time, $t_0$. For the crew, the distance between the posts is their speed times this time.`,
        T`L = vt_0`,
      ],
      [
        T`Divide the second equation by the first: left side by left side and right side by right side.`,
        T`\frac{L}{L_0} = \frac{vt_0}{vt}`,
      ],
      [
        T`There is a $v$ on the top and on the bottom, and both observers agree on its value, so it cancels.`,
        T`\frac{L}{L_0} = \frac{t_0}{t}`,
      ],
      [
        T`Time dilation relates the two times: $t = \frac{t_0}{\sqrt{1 - v^2/c^2}}$. Multiply both sides of that by the square root, then divide both sides by $t$, to get the ratio we need.`,
        T`\frac{t_0}{t} = \sqrt{1 - v^2/c^2}`,
      ],
      [
        T`Since $\frac{t_0}{t}$ equals that square root, write the square root in its place.`,
        T`\frac{L}{L_0} = \sqrt{1 - v^2/c^2}`,
      ],
      [
        T`Multiply both sides by $L_0$ to leave $L$ by itself.`,
        T`L = L_0\sqrt{1 - v^2/c^2}`,
      ],
      [
        T`The square root is less than 1 for any speed between zero and $c$, so $L$ is less than $L_0$. The contraction is along the direction of motion only.`,
        T`0 < v < c \;\Rightarrow\; L < L_0`,
      ],
    ],
  },
};
