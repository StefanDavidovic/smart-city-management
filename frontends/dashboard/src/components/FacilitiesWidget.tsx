import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";

const FacilitiesWidget: React.FC = () => {
  return (
    <div className="widget">
      <Card>
        <CardHeader>
          <CardTitle>Facilities Widget</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Facilities widget content will be implemented here.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FacilitiesWidget;
