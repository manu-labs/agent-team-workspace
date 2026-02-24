import { useParams } from "react-router-dom";
import MatchDetail from "../components/MatchDetail";

export default function Detail() {
  const { id } = useParams<{ id: string }>();

  // TODO: fetch real match data using getMatch(id) and getMatchHistory(id)
  // For now, MatchDetail renders with stub data
  void id;

  return <MatchDetail />;
}