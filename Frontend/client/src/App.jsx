import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Failure from "./components/Failure";
import PaymentComponent from "./components/PaymentForm";
import Success from "./components/Success";

function App() {
  return (
    <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<PaymentComponent />} />
            <Route path="/payment-success" element={<Success />} />
            <Route path="/payment-failure" element={<Failure />} />
          </Routes>
        </div>
      </Router>
    );
}

export default App;
