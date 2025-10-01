import React, { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";

const FacilitiesApp = React.lazy(
  () => import("facilitiesFrontend/FacilitiesApp")
);

const FacilitiesWidget: React.FC = () => {
  return (
    <div className="widget">
      <Card>
        <CardHeader>
          <CardTitle>Public Facilities</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Loading Facilities App...</div>}>
            <FacilitiesApp />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
};

export default FacilitiesWidget;
