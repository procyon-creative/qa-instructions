## Sign in shows the wrong user

> **Incomplete:** the test failed at step 4, so any later steps are missing.

1. Open http://127.0.0.1:4321/

   ![Step 1: Open http://127.0.0.1:4321/](assets/step-01.png)

2. Click the **Sign in** link

   ![Step 2: Click the Sign in link](assets/step-02.png)

3. Type **demo-user** into **Username**

   ![Step 3: Type demo-user into Username](assets/step-03.png)

4. Click the **Submit good credentials** link

   **Expected:** The page shows **Logged in as admin** (**test failed here**)

   ![Step 4: Click the Submit good credentials link](assets/step-04.png)
