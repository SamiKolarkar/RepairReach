import 'package:flutter/material.dart';

/// Border radii tokens mined from `DESIGN.md`.
abstract class AppRadius {
  static const double sm = 4.0;
  static const double defaultRadius = 8.0;
  static const double md = 12.0;
  static const double lg = 16.0;
  static const double xl = 24.0;
  static const double full = 9999.0;

  static const Radius radiusSm = Radius.circular(sm);
  static const Radius radiusDefault = Radius.circular(defaultRadius);
  static const Radius radiusMd = Radius.circular(md);
  static const Radius radiusLg = Radius.circular(lg);
  static const Radius radiusXl = Radius.circular(xl);
  static const Radius radiusFull = Radius.circular(full);

  static final BorderRadius borderSm = BorderRadius.circular(sm);
  static final BorderRadius borderDefault = BorderRadius.circular(defaultRadius);
  static final BorderRadius borderMd = BorderRadius.circular(md);
  static final BorderRadius borderLg = BorderRadius.circular(lg);
  static final BorderRadius borderXl = BorderRadius.circular(xl);
  static final BorderRadius borderFull = BorderRadius.circular(full);
}
