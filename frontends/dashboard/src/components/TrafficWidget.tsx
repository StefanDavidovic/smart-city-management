import React, { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";

const TrafficApp = React.lazy(() => import("trafficFrontend/TrafficApp"));

const TrafficWidget: React.FC = () => {
  return (
    <div className="widget">
      <Card>
        <CardHeader>
          <CardTitle>Traffic Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Loading Traffic App...</div>}>
            <TrafficApp />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
};

export default TrafficWidget;
