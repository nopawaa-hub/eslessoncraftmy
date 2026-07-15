import React from "react";
import { LayoutDashboard, RefreshCw } from "lucide-react";
import { Card } from "./ui.jsx";

// Class-based error boundary that catches render errors thrown by any
// descendant. Previously keyed by activePage in App.jsx to force a remount
// per page — now that the Router handles route isolation, we no longer need
// the key; the boundary simply wraps <Outlet/> in AppLayout.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Page crashed:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="page-stack">
          <Card title="Something went wrong" subtitle="This screen hit an unexpected error. Other parts of the app still work.">
            <div className="empty-state-box" style={{ padding: "24px 16px", textAlign: "center" }}>
              <p className="body-copy" style={{ marginBottom: 16 }}>{String(this.state.error?.message || "Unknown error.")}</p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <button type="button" className="primary-btn" onClick={() => this.setState({ error: null })}><RefreshCw /> Try again</button>
                <button type="button" className="secondary-btn" onClick={() => this.props.onGoHome?.()}><LayoutDashboard /> Back to Dashboard</button>
              </div>
            </div>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
