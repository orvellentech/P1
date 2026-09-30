"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CustomEase } from "gsap/CustomEase";
import { SplitText } from "gsap/SplitText";

let registered = false;

export function ensureGsap() {
  if (registered || typeof window === "undefined") return;
  gsap.registerPlugin(ScrollTrigger, CustomEase, SplitText);
  ScrollTrigger.config({ ignoreMobileResize: true });
  registerEases();
  registered = true;
}

/** Named cinematic eases — used everywhere instead of ad-hoc curves. */
function registerEases() {
  // Slow start, long glide: camera moves, heavy objects.
  CustomEase.create("cinema", "M0,0 C0.62,0 0.18,1 1,1");
  // Heavy fabric: hesitant start, strong middle, soft landing.
  CustomEase.create("velvet", "M0,0 C0.45,0.02 0.35,0.18 0.52,0.5 0.66,0.78 0.72,1 1,1");
  // Door swing: inertia of a heavy door that decelerates on its hinge.
  CustomEase.create("hinge", "M0,0 C0.3,0 0.35,0.6 0.55,0.82 0.7,0.96 0.82,1 1,1");
  // Editorial reveal: quick attack, very long tail.
  CustomEase.create("editorial", "M0,0 C0.16,0.84 0.3,1 1,1");
  // Snap: violent acceleration.
  CustomEase.create("snap", "M0,0 C0.9,0 1,0.6 1,1");
}

export { gsap, ScrollTrigger, CustomEase, SplitText };
