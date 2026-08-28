import 'package:flutter/material.dart';
import '../../core/constants/app_constants.dart';

/// Wraps interactive widgets to guarantee a minimum touch target size (48x48).
class TouchTargetPadding extends StatelessWidget {
  final Widget child;
  final double minSize;

  const TouchTargetPadding({
    super.key,
    required this.child,
    this.minSize = AppConstants.minTouchTarget,
  });

  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
      constraints: BoxConstraints(
        minWidth: minSize,
        minHeight: minSize,
      ),
      child: Center(
        child: child,
      ),
    );
  }
}
