import { Button } from "antd";
import React, { ReactElement, useState } from "react";

type PropType = {
  children: ReactElement[];
};

export default function Ellipsis({ children }: PropType) {
  const { length } = children;
  const firstItems = children.slice(0, 3);
  const [showMore, setShowMore] = useState<boolean>(false);
  return (
    <>
      {!showMore ? firstItems : ""}
      {!showMore && length > 3 ? (
        <Button type="link" onClick={() => setShowMore(true)}>
          More...
        </Button>
      ) : (
        ""
      )}
      {showMore ? children : ""}
    </>
  );
}
