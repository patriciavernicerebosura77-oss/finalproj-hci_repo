/**
 * Error Boundary component for catching React errors
 */
import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen gradient-bg flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md w-full text-center space-y-4 bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-xl"
          >
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
            </div>

            <div>
              <h2 className="text-lg font-bold text-foreground mb-2">
                Something went wrong
              </h2>
              <p className="text-sm text-muted-foreground">
                An error occurred while processing your request. Please try again.
              </p>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left bg-secondary/50 p-3 rounded-lg">
                <summary className="text-xs font-mono cursor-pointer text-muted-foreground">
                  Error details
                </summary>
                <pre className="mt-2 text-xs overflow-auto max-h-32 font-mono text-destructive">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}

            <button
              onClick={this.handleReset}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg gradient-primary text-white font-medium hover:shadow-lg transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              Try again
            </button>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
