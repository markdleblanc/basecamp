import Foundation from "./foundation";

/**
 * Sample usage of the Foundation library.
 */
new Foundation()
    .setup(async (_context) => {
        console.debug("Application started.");

        const versions = await _context.database.immediate.query('select * from [dbo].schema_version');

        console.debug(versions);

        // TODO: Application insights sets a timeout to flush the telemetry, this stalls our return
        //  and prevents the application from exiting. We need to determine when we're done executing our code
        //  and trigger a flush.
    })
    .then(() => {
        // Manual teardown.
    });
