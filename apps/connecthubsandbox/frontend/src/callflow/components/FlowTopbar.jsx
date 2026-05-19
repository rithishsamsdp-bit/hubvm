import "./styles/FlowTopbar.css";
import { Button } from "../../components/Index.jsx";
const FlowTopbar = ({ submit, exit, name, type }) => {
    return (
        <div className="FlowTopbar">
            <p className="FlowTopbar_heading">{name || "Call Flow Editor"}</p>
            <div className="FlowTopbar_button_container">
                {type === "create" ? (
                    <>
                        <Button variant="primary" onClick={exit}>Exit</Button>
                        <Button variant="secondary" onClick={submit}>Publish</Button>
                    </>
                ) : type === "view" ? (
                    <Button variant="primary" onClick={exit}>Exit</Button>
                ) : type === "edit" ? (
                    <>
                        <Button variant="primary" onClick={exit}>Cancel</Button>
                        <Button variant="secondary" onClick={submit}>Save</Button>
                    </>
                ) : null}

            </div>
        </div>

    )
}

export default FlowTopbar