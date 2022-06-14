node {
    try {
        stage('Clone repo') {
            checkout([
              $class: 'GitSCM',
              branches: scm.branches,
              doGenerateSubmoduleConfigurations: false,
              extensions: [[
                  $class: 'SubmoduleOption',
                  disableSubmodules: false,
                  parentCredentials: true,
                  recursiveSubmodules: true,
                  reference: '',
                  trackingSubmodules: false
              ]],
              submoduleCfg: [],
              userRemoteConfigs: scm.userRemoteConfigs
          ])
        }
        stage('Deploy') {
            if (env.BRANCH_NAME == 'conformance') {
                ebsi_conformance_deploy("clone_repo": false)
            } else {
                ebsi_fast_deploy("clone_repo": false)
            }
        }    } catch (e) {
        throw e
    } finally {
        cleanWs()
        dir("${env.WORKSPACE}@script") {
            deleteDir()
        }
    }
}
