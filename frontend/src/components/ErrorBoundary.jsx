import { Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("React error boundary caught an error", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <section className="page-shell">
          <div className="page-container">
            <div className="surface-card app-error-boundary" role="alert">
              <p className="label-text">Something went wrong</p>
              <h1>We could not render this screen.</h1>
              <p className="section-subtitle">
                Refresh the page or return to the dashboard. Your saved battle drafts remain in this browser.
              </p>
              <button type="button" className="ui-button ui-button--primary ui-button--md" onClick={() => window.location.reload()}>
                Refresh
              </button>
            </div>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
