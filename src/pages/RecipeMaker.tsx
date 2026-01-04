import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Redirect to unified Recipe Gallery with maker tab
const RecipeMaker = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/games/recipe-gallery?tab=maker", { replace: true });
  }, [navigate]);

  return null;
};

export default RecipeMaker;
