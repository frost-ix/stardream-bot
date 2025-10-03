import stardream from "../data/streamers.json" with { type: "json" };
function checkXId(name: string) {
  const membersXId = stardream.stardream;
  let xId = "";
  switch (name) {
    case "유레이":
    case "레이":
		xId = membersXId.uri.xId;
		break;
	case "온하얀":
	case "하얀":
		xId = membersXId.ohy.xId;
		break;
	case "하나빈":
	case "니빈":
		xId = membersXId.hnv.xId;
		break;
	case "이루네":
	case "루네":
		xId = membersXId.irn.xId;
		break;
	default:
		break;
  }
  return xId;
}
export { checkXId };