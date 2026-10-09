import {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import Home from "../../app/page";
import "../../components/holographic-button/holographic-button.css";
import "../../app/globals.css";
import "./tuning.css";
createRoot(document.getElementById("root")!).render(<StrictMode><Home/></StrictMode>);
